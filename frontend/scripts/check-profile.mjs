/**
 * Проверка страницы профиля.
 *
 * `/profile` закрыт гейтом `proxy.ts` по cookie `access_token` — поэтому перед
 * заходом ставим её вручную. Значение неважно: подпись проверяет gateway, а на
 * фронте гейт смотрит только на факт наличия cookie.
 *
 *   node scripts/check-profile.mjs
 */
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const base = process.env.BASE_URL || "http://localhost:3000";
await mkdir("shots", { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1920, height: 1000 } });
await context.addCookies([
  { name: "access_token", value: "playwright-fake-session", url: base },
]);
const page = await context.newPage();

const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

await page.goto(`${base}/profile`, { waitUntil: "networkidle", timeout: 60_000 });

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

await step(
  "профиль открывается",
  async () => {
    await page.getByRole("heading", { name: "Профиль", level: 1 }).waitFor({ timeout: 6000 });
    await page.getByText("Чернышёв Михаил Николаевич").waitFor({ timeout: 6000 });
    await page.getByRole("heading", { name: "Уведомления" }).waitFor({ timeout: 6000 });
    await page.getByRole("heading", { name: "Активные сеансы" }).waitFor({ timeout: 6000 });
  },
  "profile.png",
);

await step("переключатель уведомления меняет состояние", async () => {
  const toggle = page.getByRole("switch", { name: "Напоминание о поездке" }).first();
  const before = await toggle.getAttribute("aria-checked");
  await toggle.click();
  await page.waitForTimeout(400);
  if ((await toggle.getAttribute("aria-checked")) === before) {
    throw new Error("aria-checked не изменился");
  }
});

await step("текущий сеанс нельзя закрыть", async () => {
  const closeButtons = page.getByRole("button", { name: /Завершить сеанс/ });
  if ((await closeButtons.count()) !== 1) {
    throw new Error(`кнопок закрытия ${await closeButtons.count()}, ожидалась 1`);
  }
});

await step("сеанс закрывается крестиком", async () => {
  await page.getByRole("button", { name: /Завершить сеанс/ }).first().click();
  await page.waitForTimeout(400);
  if ((await page.getByRole("button", { name: /Завершить сеанс/ }).count()) !== 0) {
    throw new Error("сеанс остался в списке");
  }
});

await browser.close();

console.log("Профиль:\n");
console.log(results.join("\n"));
const failed = results.filter((r) => r.includes("✘")).length;
console.log(`\n${results.length - failed} passed, ${failed} failed`);
if (errors.length) {
  console.log("\nОшибки страницы:");
  for (const e of [...new Set(errors)].slice(0, 8)) console.log("  " + e);
}
process.exit(failed ? 1 : 0);
