/**
 * Проверка шапки: меню личного кабинета и модалка «Скачать приложение».
 *
 *   node scripts/check-header.mjs
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

await page.goto(base, { waitUntil: "networkidle", timeout: 60_000 });

const results = [];
async function step(name, action, shot) {
  try {
    await action();
    // 900 мс: картинки внутри модалки подгружаются только при её появлении.
    await page.waitForTimeout(900);
    if (shot) await page.screenshot({ path: `shots/${shot}` });
    results.push(`  ✔ ${name}`);
  } catch (error) {
    results.push(`  ✘ ${name} — ${error.message.split("\n")[0]}`);
  }
}

await step(
  "открывается меню личного кабинета",
  async () => {
    await page.getByRole("button", { name: "Личный кабинет" }).click();
    await page.getByRole("link", { name: "Мои билеты" }).waitFor({ state: "visible", timeout: 4000 });
    // «Войти» — ссылка на /login, а не кнопка.
    await page.getByRole("link", { name: "Войти" }).waitFor({ state: "visible", timeout: 4000 });
  },
  "header-account-menu.png",
);

// Панели уходят из DOM не сразу: AnimatePresence доигрывает закрытие (~220мс).
// Поэтому ждём именно исчезновения элемента, а не проверяем видимость сразу.
await step("меню закрывается по Escape", async () => {
  await page.keyboard.press("Escape");
  await page
    .getByRole("link", { name: "Мои билеты" })
    .waitFor({ state: "detached", timeout: 4000 });
});

await step(
  "открывается модалка «Скачать приложение»",
  async () => {
    await page.getByRole("button", { name: "Скачать приложение" }).click();
    await page.getByRole("dialog").waitFor({ state: "visible", timeout: 4000 });
  },
  "header-app-modal.png",
);

await step("модалка блокирует прокрутку фона", async () => {
  const overflow = await page.evaluate(() => document.body.style.overflow);
  if (overflow !== "hidden") throw new Error(`body overflow = "${overflow}"`);
});

await step("модалка закрывается по Escape и возвращает прокрутку", async () => {
  await page.keyboard.press("Escape");
  await page.getByRole("dialog").waitFor({ state: "detached", timeout: 4000 });
  const overflow = await page.evaluate(() => document.body.style.overflow);
  if (overflow === "hidden") throw new Error("прокрутка осталась заблокированной");
});

await step("модалка закрывается кликом по подложке", async () => {
  await page.getByRole("button", { name: "Скачать приложение" }).click();
  await page.getByRole("dialog").waitFor({ state: "visible", timeout: 4000 });
  // Клик в левый край подложки — вне карточки 1220px по центру.
  await page.mouse.click(20, 500);
  await page.getByRole("dialog").waitFor({ state: "detached", timeout: 4000 });
});

await browser.close();

console.log("Шапка:\n");
console.log(results.join("\n"));
const failed = results.filter((r) => r.includes("✘")).length;
console.log(`\n${results.length - failed} passed, ${failed} failed`);
if (errors.length) {
  console.log("\nОшибки страницы:");
  for (const e of [...new Set(errors)].slice(0, 8)) console.log("  " + e);
}
process.exit(failed ? 1 : 0);
