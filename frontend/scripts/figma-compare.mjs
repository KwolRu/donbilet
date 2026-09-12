/**
 * Сверка реализации с макетом.
 *
 * Снимает наши экраны в браузере, кладёт рядом отрисовки узлов Figma и считает,
 * насколько они разошлись. Отвечает на вопрос «совпало или нет» числом, а не
 * ощущением: глазами расхождение в 8px по высоте блока не видно, а в diff-кадре
 * оно подсвечено.
 *
 *   node scripts/figma-compare.mjs            # все пары из figma-refs.json
 *   node scripts/figma-compare.mjs popular    # только совпавшие по имени
 *
 * Результат — в `shots/compare/`: для каждой пары три файла (эталон, наш кадр,
 * подсветка различий) и строка отчёта в консоли.
 *
 * Эталоны лежат в репозитории и обновляются вручную — см. `figma-refs.json`.
 * Тянуть их из Figma прямо отсюда нельзя: REST API требует токена, а MCP
 * доступен только агенту, не скрипту.
 */
import { chromium } from "@playwright/test";
import sharp from "sharp";
import { mkdir, readFile, access } from "node:fs/promises";
import path from "node:path";

const base = process.env.BASE_URL || "http://localhost:3000";
const OUT_DIR = "shots/compare";

/** Порог различия одного пикселя по сумме каналов, 0…765. */
const PIXEL_THRESHOLD = 60;

/**
 * Выше этой доли несовпавших пикселей пара считается расхождением.
 *
 * 12%, а не 2–3%: Figma и браузер по-разному сглаживают шрифт, и текстовый
 * блок даёт 5–8% «различий» даже при идеальном совпадении раскладки. Число —
 * индикатор, куда смотреть, а не приговор: решает глаз по diff-кадру.
 */
const FAIL_RATIO = 0.12;

const filter = process.argv[2]?.toLowerCase();

const registry = JSON.parse(await readFile("scripts/figma-refs.json", "utf8"));
const pairs = registry.pairs.filter(
  (pair) => !filter || pair.name.toLowerCase().includes(filter) || pair.ref.includes(filter),
);

if (pairs.length === 0) {
  console.log(`Ни одна пара не подошла под «${filter}».`);
  process.exit(0);
}

await mkdir(OUT_DIR, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });

const rows = [];

for (const pair of pairs) {
  const slug = path.basename(pair.ref, ".png");
  const ourPath = `${OUT_DIR}/${slug}.ours.png`;
  const refCopy = `${OUT_DIR}/${slug}.figma.png`;
  const diffPath = `${OUT_DIR}/${slug}.diff.png`;

  if (!(await exists(pair.ref))) {
    rows.push({ name: pair.name, status: "нет эталона", hint: pair.ref });
    continue;
  }

  await page.goto(base + pair.route, { waitUntil: "networkidle", timeout: 60_000 });
  // Секции появляются при прокрутке — без прохода они останутся прозрачными.
  await scrollThrough(page);

  if (pair.selector) {
    const element = page.locator(pair.selector).first();
    await element.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await element.screenshot({ path: ourPath });
  } else {
    await page.screenshot({ path: ourPath, fullPage: true });
  }

  const { ratio, width, height } = await compare(pair.ref, ourPath, refCopy, diffPath);
  rows.push({
    name: pair.name,
    status: ratio <= FAIL_RATIO ? "совпало" : "разошлось",
    ratio,
    size: `${width}×${height}`,
    diff: diffPath,
  });
}

await browser.close();

console.log("Сверка с макетом:\n");
for (const row of rows) {
  if (row.status === "нет эталона") {
    console.log(`  ? ${row.name} — эталона нет: ${row.hint}`);
    continue;
  }
  const mark = row.status === "совпало" ? "✔" : "✘";
  const percent = (row.ratio * 100).toFixed(1).padStart(5);
  console.log(`  ${mark} ${row.name} — расхождение ${percent}% (${row.size}) → ${row.diff}`);
}

const failed = rows.filter((row) => row.status === "разошлось").length;
const missing = rows.filter((row) => row.status === "нет эталона").length;
console.log(
  `\n${rows.length - failed - missing} совпало, ${failed} разошлось` +
    (missing ? `, ${missing} без эталона` : ""),
);
process.exit(failed ? 1 : 0);

// ─── Вспомогательное ─────────────────────────────────────────────────────────

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

async function scrollThrough(page) {
  await page.evaluate(async () => {
    const step = window.innerHeight / 2;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 400));
  });
}

/**
 * Сравнение двух картинок.
 *
 * Оба кадра приводятся к размеру эталона: наш экран и отрисовка Figma почти
 * никогда не совпадают в пикселях один в один, а сравнивать нужно раскладку,
 * а не результат масштабирования.
 */
async function compare(refFile, ourFile, refCopy, diffFile) {
  const meta = await sharp(refFile).metadata();
  const width = meta.width;
  const height = meta.height;

  const toRaw = (file) =>
    sharp(file)
      .resize(width, height, { fit: "fill" })
      .removeAlpha()
      .raw()
      .toBuffer();

  const [refBuf, ourBuf] = await Promise.all([toRaw(refFile), toRaw(ourFile)]);
  await sharp(refFile).resize(width, height, { fit: "fill" }).toFile(refCopy);

  const diff = Buffer.alloc(width * height * 3);
  let mismatched = 0;

  for (let i = 0; i < refBuf.length; i += 3) {
    const delta =
      Math.abs(refBuf[i] - ourBuf[i]) +
      Math.abs(refBuf[i + 1] - ourBuf[i + 1]) +
      Math.abs(refBuf[i + 2] - ourBuf[i + 2]);

    if (delta > PIXEL_THRESHOLD) {
      mismatched++;
      // Различия — красным, совпадения — приглушённым оригиналом: так видно,
      // где именно разошлось, не теряя контекста.
      diff[i] = 255;
      diff[i + 1] = 0;
      diff[i + 2] = 0;
    } else {
      const grey = Math.round((refBuf[i] + refBuf[i + 1] + refBuf[i + 2]) / 3);
      const faded = Math.round(grey * 0.35 + 255 * 0.65);
      diff[i] = faded;
      diff[i + 1] = faded;
      diff[i + 2] = faded;
    }
  }

  await sharp(diff, { raw: { width, height, channels: 3 } }).toFile(diffFile);

  return { ratio: mismatched / (width * height), width, height };
}
