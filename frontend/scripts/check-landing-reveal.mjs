/**
 * Проверка появления блоков лендинга.
 *
 *   node scripts/check-landing-reveal.mjs
 *
 * Смотрим две вещи, которые статичный кадр не показывает:
 *   hero появляется после того, как ушёл экран загрузки, а не под ним;
 *   секции ниже выезжают при прокрутке и доезжают до конца.
 */
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const base = process.env.BASE_URL || "http://localhost:3000";
await mkdir("shots", { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1000 } });

const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

const results = [];
async function step(name, action) {
  try {
    await action();
    results.push(`  ✔ ${name}`);
  } catch (error) {
    results.push(`  ✘ ${name} — ${error.message.split("\n")[0]}`);
  }
}

/** Прозрачность частей hero: плашки, заголовок, автобус, форма. */
const heroOpacity = () =>
  page.evaluate(() => {
    const inner = document.querySelector("section > div.relative.flex");
    const parts = [
      inner?.children[0],
      inner?.children[1]?.children[0],
      inner?.children[1]?.children[1]?.children[0],
      inner?.children[1]?.children[1]?.children[1],
    ];
    return parts.map((el) => (el ? Number(getComputedStyle(el).opacity) : -1));
  });

/** Прозрачность секций под hero — по порядку следования. */
const sectionsOpacity = () =>
  page.evaluate(() =>
    [...(document.querySelector("main div.mx-auto")?.children ?? [])].map((el) =>
      Number(getComputedStyle(el).opacity),
    ),
  );

await page.goto(base, { waitUntil: "domcontentloaded", timeout: 60_000 });

await step("hero скрыт, пока держится экран загрузки", async () => {
  await page.waitForTimeout(250);
  const parts = await heroOpacity();
  if (parts.some((o) => o !== 0)) throw new Error(`hero виден раньше времени: ${parts.join(", ")}`);
});

await step("hero появляется после ухода экрана загрузки", async () => {
  await page
    .getByRole("status", { name: "Загрузка сайта" })
    .waitFor({ state: "detached", timeout: 10_000 });
  await page.waitForTimeout(1200);
  const parts = await heroOpacity();
  if (parts.some((o) => o < 0.99)) throw new Error(`hero не доехал: ${parts.join(", ")}`);
  await page.screenshot({ path: "shots/hero-revealed.png" });
});

// Hero занимает почти весь первый экран, и запуск сдвинут внутрь окна, так что
// до прокрутки не должна появиться ни одна секция — включая первую.
await step("секции ниже ждут прокрутки", async () => {
  const opacities = await sectionsOpacity();
  if (opacities.some((o) => o !== 0)) {
    throw new Error(`секции видны до прокрутки: ${opacities.join(", ")}`);
  }
});

await step("секция появляется при прокрутке к ней", async () => {
  await page.mouse.wheel(0, 900);
  await page.waitForTimeout(1200);
  const [, second] = await sectionsOpacity();
  if (second < 0.99) throw new Error(`секция не доехала: ${second}`);
});

/*
 * Анимация должна идти, а не проскакивать. Прежняя эвристика «при быстрой
 * прокрутке показывать сразу» срабатывала на обычном колесе (3000–5000px/с),
 * и секции появлялись скачком — со стороны это читалось как отсутствие
 * анимации вовсе. Ловим промежуточную прозрачность сразу после прокрутки.
 */
await step("появление идёт анимацией, а не скачком", async () => {
  const midway = [];
  for (let i = 0; i < 12; i++) {
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(90);
    const values = await sectionsOpacity();
    midway.push(...values.filter((o) => o > 0.02 && o < 0.98));
  }
  if (midway.length === 0) throw new Error("ни одна секция не была поймана в движении");
});

await browser.close();

console.log("Появление блоков лендинга:\n");
console.log(results.join("\n"));
const failed = results.filter((r) => r.includes("✘")).length;
console.log(`\n${results.length - failed} passed, ${failed} failed`);
if (errors.length) {
  console.log("\nОшибки страницы:");
  for (const e of [...new Set(errors)].slice(0, 8)) console.log("  " + e);
}
process.exit(failed ? 1 : 0);
