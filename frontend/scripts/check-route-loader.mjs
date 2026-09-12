/**
 * Проверка экрана загрузки при переходе между страницами.
 *
 *   node scripts/check-route-loader.mjs
 *
 * Переходы публичного сайта — и смена каркаса (лендинг → вход), и соседние
 * страницы (новости, вопросы) — проходят за полноэкранным лоадером, тем же,
 * что встречает на первом заходе.
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

const loader = () => page.getByRole("status", { name: "Переход на страницу" });

/** Стартовый экран загрузки сайта держится до готовности первого кадра. */
async function openLanding() {
  await page.goto(base, { waitUntil: "networkidle", timeout: 60_000 });
  await page
    .getByRole("status", { name: "Загрузка сайта" })
    .waitFor({ state: "detached", timeout: 10_000 });
}

await openLanding();

await step("лендинг → вход: экран загрузки появляется", async () => {
  await page.getByRole("button", { name: "Личный кабинет" }).click();
  await page.getByRole("link", { name: "Войти" }).click();
  await loader().waitFor({ state: "visible", timeout: 4000 });
  await page.screenshot({ path: "shots/route-loader.png" });
});

await step("экран уходит, страница входа открыта", async () => {
  await loader().waitFor({ state: "detached", timeout: 10_000 });
  await page.waitForURL("**/login", { timeout: 4000 });
});

await openLanding();

await step("лендинг → новости: экран загрузки появляется", async () => {
  await page.getByRole("link", { name: "Все новости" }).first().click();
  await loader().waitFor({ state: "visible", timeout: 4000 });
  await loader().waitFor({ state: "detached", timeout: 10_000 });
  await page.waitForURL("**/news", { timeout: 4000 });
});

await step("новости → вопросы: экран загрузки появляется", async () => {
  await page.getByRole("link", { name: "Вопросы и ответы" }).first().click();
  await loader().waitFor({ state: "visible", timeout: 4000 });
  await loader().waitFor({ state: "detached", timeout: 10_000 });
  await page.waitForURL("**/faq", { timeout: 4000 });
});

await browser.close();

console.log("Экран загрузки при переходе между страницами:\n");
console.log(results.join("\n"));
const failed = results.filter((r) => r.includes("✘")).length;
console.log(`\n${results.length - failed} passed, ${failed} failed`);
if (errors.length) {
  console.log("\nОшибки страницы:");
  for (const e of [...new Set(errors)].slice(0, 8)) console.log("  " + e);
}
process.exit(failed ? 1 : 0);
