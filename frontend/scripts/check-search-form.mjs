/**
 * Проверка интерактива формы поиска на главной.
 *
 * Открывает каждую выпадающую панель, делает скриншот и печатает результат.
 * Это не замена e2e-тестам — быстрый прогон для сверки с макетом на этапе вёрстки.
 *
 *   node scripts/check-search-form.mjs
 */
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const base = process.env.BASE_URL || "http://localhost:3000";
await mkdir("shots", { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1200 } });

const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

await page.goto(base, { waitUntil: "networkidle", timeout: 60_000 });

const results = [];
async function step(name, action, shot) {
  try {
    await action();
    await page.waitForTimeout(350);
    // 1200 по высоте: выпадающие панели уходят ниже Hero, на 900 они обрезались.
    if (shot) await page.screenshot({ path: `shots/${shot}`, clip: { x: 0, y: 0, width: 1920, height: 1200 } });
    results.push(`  ✔ ${name}`);
  } catch (error) {
    results.push(`  ✘ ${name} — ${error.message.split("\n")[0]}`);
  }
}

// Панель городов
await step(
  "открывается список городов «Откуда»",
  async () => {
    await page.getByRole("button", { name: /Откуда/ }).click();
    await page.getByText("Ростов-на-Дону").first().waitFor({ state: "visible", timeout: 4000 });
  },
  "form-cities.png",
);

await step("город выбирается", async () => {
  await page.getByText("Ростов-на-Дону").first().click();
  await page.getByText("Ростов-на-Дону").first().waitFor({ state: "visible", timeout: 4000 });
});

// Календарь
await page.keyboard.press("Escape");
await step(
  "открывается календарь",
  async () => {
    await page.getByRole("button", { name: /Дата/ }).click();
    await page.getByRole("button", { name: "Следующий месяц" }).waitFor({ state: "visible", timeout: 4000 });
  },
  "form-calendar.png",
);

await step("календарь листает месяцы", async () => {
  await page.getByRole("button", { name: "Следующий месяц" }).click();
});

// Пассажиры
await page.keyboard.press("Escape");
await step(
  "открывается панель пассажиров",
  async () => {
    await page.getByRole("button", { name: /Кто едет/ }).click();
    await page.getByRole("heading", { name: "Пассажиры" }).waitFor({ state: "visible", timeout: 4000 });
  },
  "form-passengers.png",
);

await step("счётчик пассажиров увеличивается", async () => {
  const before = await page.getByRole("button", { name: /Кто едет/ }).innerText();
  await page.getByRole("button", { name: "Добавить: Дети" }).click();
  await page.waitForTimeout(200);
  const after = await page.getByRole("button", { name: /Кто едет/ }).innerText();
  if (before === after) throw new Error("подпись поля не изменилась");
});

await page.keyboard.press("Escape");

// Тоггл и чипы
await step("тоггл переключается", async () => {
  const toggle = page.getByRole("switch", { name: /Искать отели/ });
  const before = await toggle.getAttribute("aria-checked");
  await toggle.click();
  await page.waitForTimeout(150);
  if ((await toggle.getAttribute("aria-checked")) === before) throw new Error("aria-checked не изменился");
});

// Чипы городов: каждая группа подставляет город в поле, под которым нарисована.
// Раньше пары трактовались как маршрут целиком, и «Москва» из левой группы
// уезжала в «Куда» — проверяем именно это.
await step("чип левой группы подставляет город в «Откуда»", async () => {
  await page.getByRole("button", { name: "Москва", exact: true }).first().click();
  await page.waitForTimeout(200);
  const from = await page.getByRole("button", { name: /Откуда/ }).innerText();
  if (!from.includes("Москва")) throw new Error(`в «Откуда» осталось: ${from.replace(/\n/g, " ")}`);
});

await step("чип правой группы подставляет город в «Куда»", async () => {
  await page.getByRole("button", { name: "Санкт-Петербург", exact: true }).last().click();
  await page.waitForTimeout(200);
  const to = await page.getByRole("button", { name: /Куда/ }).innerText();
  if (!to.includes("Санкт-Петербург")) throw new Error(`в «Куда» осталось: ${to.replace(/\n/g, " ")}`);
});

await step("чип даты подставляет дату", async () => {
  await page.getByRole("button", { name: "Сегодня" }).click();
});

// FAQ. Берём второй вопрос по порядку, а не по тексту: состав выборки на
// главной меняется вместе с моками, и тест не должен от него зависеть.
await step("аккордеон FAQ раскрывается", async () => {
  const question = page.locator("[aria-expanded]").filter({ hasText: "?" }).nth(1);
  await question.scrollIntoViewIfNeeded();
  await question.click();
  await page.waitForTimeout(400);
  if ((await question.getAttribute("aria-expanded")) !== "true") throw new Error("aria-expanded не true");
});

await browser.close();

console.log("Интерактив формы поиска:\n");
console.log(results.join("\n"));
const failed = results.filter((r) => r.includes("✘")).length;
console.log(`\n${results.length - failed} passed, ${failed} failed`);
if (errors.length) {
  console.log("\nОшибки страницы:");
  for (const e of [...new Set(errors)].slice(0, 8)) console.log("  " + e);
}
process.exit(failed ? 1 : 0);
