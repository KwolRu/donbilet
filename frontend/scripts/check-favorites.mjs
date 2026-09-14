/**
 * Проверка раздела «Избранное».
 *
 * `/profile/favorites` закрыт гейтом `proxy.ts` по cookie `access_token` —
 * перед заходом ставим её вручную, как в `check-profile.mjs`.
 *
 *   node scripts/check-favorites.mjs
 */
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const base = process.env.BASE_URL || "http://localhost:3000";
await mkdir("shots", { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
await context.addCookies([{ name: "access_token", value: "playwright-fake-session", url: base }]);
const page = await context.newPage();

const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

await page.goto(`${base}/profile/favorites`, { waitUntil: "networkidle", timeout: 60_000 });

const results = [];
async function step(name, action, shot) {
  try {
    await action();
    await page.waitForTimeout(600);
    if (shot) await page.screenshot({ path: `shots/${shot}` });
    results.push(`  ✔ ${name}`);
  } catch (error) {
    results.push(`  ✘ ${name} — ${error.message.split("\n")[0]}`);
  }
}

const loader = () => page.getByText("Собираем данные по вашим поездкам");

/** Дождаться, пока подборка перестроится: debounce плюс заставка. */
async function settle() {
  await page.waitForTimeout(400);
  await loader().waitFor({ state: "hidden", timeout: 6000 }).catch(() => {});
  await page.waitForTimeout(200);
}

await step(
  "раздел открывается с направлениями",
  async () => {
    await page.getByRole("heading", { name: "Избранное" }).waitFor({ timeout: 5000 });
    await page.getByRole("heading", { name: "Новосибирск — Владивосток" }).waitFor({
      timeout: 4000,
    });
    await page.getByText("Цена может измениться").first().waitFor({ timeout: 4000 });
  },
  "favorites-directions.png",
);

await step("вариант убирается из избранного", async () => {
  const before = await page.locator("article").count();
  await page.getByRole("button", { name: "Убрать из избранного" }).first().click();
  await page.waitForTimeout(600);
  const after = await page.locator("article").count();
  if (after !== before - 1) throw new Error(`вариант не удалён: ${before} → ${after}`);
});

await step(
  "вкладка «Билеты» показывает рейсы с корешком",
  async () => {
    await page.getByRole("button", { name: "Билеты", exact: true }).click();
    await settle();
    await page.getByText("ТФ Движение-2000").first().waitFor({ timeout: 4000 });
    await page.getByRole("button", { name: "Выбрать место" }).first().waitFor({ timeout: 4000 });
  },
  "favorites-trips.png",
);

await step("фильтр по транспорту сужает подборку", async () => {
  const before = await page.locator("article").count();
  await page.getByRole("button", { name: "Автобус", exact: true }).click();
  await settle();
  const after = await page.locator("article").count();
  if (after >= before) throw new Error(`фильтр не сработал: было ${before}, стало ${after}`);
  await page.getByRole("button", { name: "Все", exact: true }).click();
  await settle();
});

await step("поиск по направлению показывает заставку и находит группу", async () => {
  await page.getByRole("textbox", { name: "Поиск по избранному" }).fill("Калининград");
  await loader().waitFor({ state: "visible", timeout: 3000 });
  await settle();
  // Уходящая группа живёт в DOM, пока доигрывает `AnimatePresence`.
  await page
    .getByRole("heading", { name: "Новосибирск — Владивосток" })
    .waitFor({ state: "detached", timeout: 4000 });

  // Только в рабочей области: в сайдбаре свой h2 — промо-карточка.
  const groups = await page.locator("main h2").count();
  if (groups !== 1) throw new Error(`ожидалась одна группа, найдено ${groups}`);

  await page.getByRole("button", { name: "Очистить поиск" }).click();
  await settle();
});

await step(
  "вкладка «Отели» объясняет, почему пусто",
  async () => {
    await page.getByRole("button", { name: "Отели", exact: true }).click();
    await settle();
    await page.getByRole("heading", { name: "Отели пока не сохраняются" }).waitFor({
      timeout: 4000,
    });
  },
  "favorites-hotels.png",
);

await browser.close();

console.log("Избранное:\n");
console.log(results.join("\n"));
const failed = results.filter((r) => r.includes("✘")).length;
console.log(`\n${results.length - failed} passed, ${failed} failed`);
if (errors.length) {
  console.log("\nОшибки страницы:");
  for (const e of [...new Set(errors)].slice(0, 8)) console.log("  " + e);
}
process.exit(failed ? 1 : 0);
