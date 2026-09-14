/**
 * Проверка страницы поиска рейсов.
 *
 *   node scripts/check-search.mjs
 *
 * Страница публичная — гейт `proxy.ts` её не закрывает.
 */
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const base = process.env.BASE_URL || "http://localhost:3000";
await mkdir("shots", { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

await page.goto(`${base}/races`, { waitUntil: "networkidle", timeout: 60_000 });

const results = [];
async function step(name, action, shot) {
  try {
    await action();
    await page.waitForTimeout(500);
    if (shot) await page.screenshot({ path: `shots/${shot}` });
    results.push(`  ✔ ${name}`);
  } catch (error) {
    results.push(`  ✘ ${name} — ${error.message.split("\n")[0]}`);
  }
}

const loader = () => page.getByText("Собираем данные по вашим поездкам");

/**
 * Сколько рейсов показано. Считаем по кнопке «Выбрать место», а не по
 * `article`: карточки жилья в подборке — тоже `article`, и они бы попали в счёт.
 */
function tripCount() {
  return page.getByRole("button", { name: /^Выбрать место/ }).count();
}

/** Дождаться перестроения выдачи: заставка плюс анимация списка. */
async function settle() {
  await page.waitForTimeout(300);
  await loader().waitFor({ state: "hidden", timeout: 6000 }).catch(() => {});
  await page.waitForTimeout(300);
}

await step(
  "страница открывается с выдачей",
  async () => {
    await page.getByText(/Найдено \d+ рейс/).waitFor({ timeout: 5000 });
    await page.getByText("ТФ Движение-2000").first().waitFor({ timeout: 4000 });
    await page.getByRole("button", { name: "Выбрать место" }).first().waitFor({ timeout: 4000 });
  },
  "search-results.png",
);

await step("плитки транспорта переключаются", async () => {
  await page.getByRole("button", { name: /Авиабилеты/ }).click();
  await settle();
  const pressed = await page
    .getByRole("button", { name: /Авиабилеты/ })
    .getAttribute("aria-pressed");
  if (pressed !== "true") throw new Error("плитка не стала выбранной");

  await page.getByRole("button", { name: /Автобус/ }).click();
  await settle();
});

await step("календарь цен выбирает дату", async () => {
  const column = page.getByRole("button", { name: /22 сен - 26 сен/ });
  await column.click();
  await settle();
  if ((await column.getAttribute("aria-pressed")) !== "true") {
    throw new Error("дата не выбралась");
  }
});

/** «Найдено 12 рейсов» → 12. По счётчику, а не по карточкам: на экране их
    всегда не больше страницы, и отсев в хвосте списка был бы не виден. */
async function foundCount() {
  const text = (await page.getByText(/Найдено \d+ рейс/).textContent()) ?? "";
  return Number(text.replace(/\D/g, "")) || 0;
}

await step("быстрый фильтр сужает выдачу", async () => {
  const before = await foundCount();

  await page.getByRole("button", { name: "Только с багажом" }).click();
  await settle();

  const after = await foundCount();
  if (after >= before) throw new Error(`фильтр не сработал: было ${before}, стало ${after}`);
});

await step("выбирается только один фильтр разом", async () => {
  await page.getByRole("button", { name: "Без пересадки" }).click();
  await settle();

  const selected = await page
    .locator('button[aria-pressed="true"]')
    .filter({ hasText: /Только с багажом|Без пересадки|Только прямые/ })
    .count();
  if (selected !== 1) throw new Error(`выбрано чипов: ${selected}, ожидался один`);
});

await step("«Очистить» снимает все фильтры", async () => {
  await page.getByRole("button", { name: "Очистить" }).click();
  await settle();
  if (await page.getByRole("button", { name: "Очистить" }).count()) {
    throw new Error("чип «Очистить» остался — значит фильтры не сняты");
  }
});

await step(
  "переключение вида меняет карточки на строки",
  async () => {
    await page.getByRole("button", { name: "Списком" }).click();
    await settle();
    await page.getByRole("button", { name: /Выбрать место за/ }).first().waitFor({ timeout: 4000 });

    await page.getByRole("button", { name: "Карточками" }).click();
    await settle();
  },
  "search-rows.png",
);

await step("подборка жилья листается", async () => {
  await page.getByRole("heading", { name: /Жильё во Владивостоке/ }).waitFor({ timeout: 4000 });
  await page.getByRole("button", { name: "Следующие варианты" }).click();
  await page.waitForTimeout(700);
});

await step(
  "панель фильтров открывается и сбрасывается",
  async () => {
    await page.getByRole("button", { name: "Фильтр" }).click();
    await page.getByRole("heading", { name: "Фильтры" }).waitFor({ timeout: 4000 });
    await page.getByRole("button", { name: /Показать 56 рейса/ }).waitFor({ timeout: 4000 });

    // Панель прокручивается — вариант может быть ниже края экрана.
    const option = page.getByText("от 20 кг", { exact: true });
    await option.scrollIntoViewIfNeeded();
    await option.click();

    await page.getByRole("button", { name: "Сбросить фильтры" }).click();
    await page.waitForTimeout(400);

    await page.getByRole("button", { name: /Показать 56 рейса/ }).click();
    await settle();
  },
  "search-filters.png",
);

await step("кнопка догрузки добавляет билеты", async () => {
  const before = await tripCount();
  const more = page.getByRole("button", { name: /Показать ещё/ });
  if (await more.count()) {
    await more.click();
    await page.waitForTimeout(700);
    const after = await tripCount();
    if (after <= before) throw new Error("список не вырос");
  }
});

await browser.close();

console.log("Поиск рейсов:\n");
console.log(results.join("\n"));
const failed = results.filter((r) => r.includes("✘")).length;
console.log(`\n${results.length - failed} passed, ${failed} failed`);
if (errors.length) {
  console.log("\nОшибки страницы:");
  for (const e of [...new Set(errors)].slice(0, 8)) console.log("  " + e);
}
process.exit(failed ? 1 : 0);
