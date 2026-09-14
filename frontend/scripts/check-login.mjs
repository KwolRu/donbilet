/**
 * Проверка экрана входа: три шага и два состояния ошибки.
 *
 * Снимает по кадру на каждое состояние из макета `authorization` — их потом
 * сверяют с Figma вручную. Заодно проверяет, что переходы вообще работают.
 *
 *   node scripts/check-login.mjs
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

await page.goto(`${base}/login`, { waitUntil: "networkidle", timeout: 60_000 });

const results = [];
async function step(name, action, shot) {
  try {
    await action();
    await page.waitForTimeout(700);
    if (shot) await page.screenshot({ path: `shots/${shot}` });
    results.push(`  ✔ ${name}`);
  } catch (error) {
    results.push(`  ✘ ${name} — ${error.message.split("\n")[0]}`);
  }
}

const emailField = page.getByRole("textbox", { name: "Ваша почта" });
const sendButton = page.getByRole("button", { name: "Отправить код" });
const digit = (n) => page.getByRole("textbox", { name: `Цифра ${n} из 4` });

await step("экран входа открывается", async () => {
  await page.getByRole("heading", { name: "Войдите в профиль" }).waitFor({ timeout: 5000 });
  await page.getByRole("link", { name: "Мои билеты" }).waitFor({ timeout: 5000 });
}, "login-email.png");

// Роль alert в dev-режиме занимает ещё и оверлей Next.js, поэтому ищем по тексту.
const hint = (text) => page.getByRole("alert").filter({ hasText: text });

await step(
  "пустая почта показывает подсказку",
  async () => {
    await sendButton.click();
    await hint("код не отправить").waitFor({ state: "visible", timeout: 4000 });
  },
  "login-email-error.png",
);

await step(
  "почта принимается и открывается ввод кода",
  async () => {
    await emailField.fill("m.chernyshev@mail.ru");
    await sendButton.click();
    await page.getByRole("heading", { name: "Подтвердите вход" }).waitFor({ timeout: 6000 });
  },
  "login-code.png",
);

await step(
  "цифры переводят фокус вперёд",
  async () => {
    await digit(1).fill("6");
    await digit(2).fill("3");
    const focused = await page.evaluate(() => document.activeElement?.getAttribute("aria-label"));
    if (focused !== "Цифра 3 из 4") throw new Error(`фокус на «${focused}»`);
  },
  "login-code-partial.png",
);

await step(
  "неверный код подсвечивается ошибкой",
  async () => {
    await digit(3).fill("9");
    await digit(4).fill("9");
    await hint("код не подошёл").waitFor({ state: "visible", timeout: 6000 });
  },
  "login-code-error.png",
);

await step("Backspace очищает и уводит назад", async () => {
  await digit(4).focus();
  await page.keyboard.press("Backspace");
  await page.keyboard.press("Backspace");
  const focused = await page.evaluate(() => document.activeElement?.getAttribute("aria-label"));
  if (focused !== "Цифра 3 из 4") throw new Error(`фокус на «${focused}»`);
});

await step(
  "новый профиль просит согласия",
  async () => {
    // Возвращаемся к почте и вводим незнакомый адрес — мок ведёт на регистрацию.
    await page.getByRole("button", { name: "Изменить почту" }).click();
    await emailField.fill("new.user@example.com");
    await sendButton.click();
    await page.getByRole("heading", { name: "Подтвердите вход" }).waitFor({ timeout: 6000 });
    for (const [index, value] of ["1", "2", "3", "4"].entries()) {
      await digit(index + 1).fill(value);
    }
    await page
      .getByRole("button", { name: "Создать новый профиль" })
      .waitFor({ state: "visible", timeout: 6000 });
  },
  "login-register.png",
);

await step("согласие разблокирует создание профиля", async () => {
  const button = page.getByRole("button", { name: "Создать новый профиль" });
  await button.waitFor({ state: "visible", timeout: 6000 });
  if (!(await button.isDisabled())) throw new Error("кнопка активна без согласия");

  // Чекбокс, а не ссылка внутри его подписи: по тексту нашлись бы обе.
  await page.getByRole("checkbox").first().check({ force: true });
  await page.waitForTimeout(400);
  if (await button.isDisabled()) throw new Error("кнопка осталась заблокированной");
});

/*
 * Самое важное: кнопка должна не только разблокироваться, но и сработать.
 * Раньше у неё вовсе не было обработчика — форма выглядела рабочей, а нажатие
 * не делало ничего.
 */
await step(
  "создание профиля открывает сессию и ведёт в кабинет",
  async () => {
    await page.getByRole("button", { name: "Создать новый профиль" }).click();
    await page.waitForURL("**/profile", { timeout: 10_000 });

    const cookies = await page.context().cookies();
    if (!cookies.some((cookie) => cookie.name === "access_token")) {
      throw new Error("сессия не открыта: cookie access_token нет");
    }
  },
  "login-signed-in.png",
);

await step("гейт возвращает на страницу, с которой развернул", async () => {
  await page.context().clearCookies();
  await page.goto(`${base}/profile/passengers`, { waitUntil: "networkidle" });
  await page.waitForURL(/\/login\?from=%2Fprofile%2Fpassengers/, { timeout: 6000 });

  await emailField.fill("new.user@example.com");
  await sendButton.click();
  await page.getByRole("heading", { name: "Подтвердите вход" }).waitFor({ timeout: 6000 });
  for (const [index, value] of ["1", "2", "3", "4"].entries()) {
    await digit(index + 1).fill(value);
  }

  await page.getByRole("checkbox").first().check({ force: true });
  await page.getByRole("button", { name: "Создать новый профиль" }).click();
  await page.waitForURL("**/profile/passengers", { timeout: 10_000 });
});

await browser.close();

console.log("Экран входа:\n");
console.log(results.join("\n"));
const failed = results.filter((r) => r.includes("✘")).length;
console.log(`\n${results.length - failed} passed, ${failed} failed`);
if (errors.length) {
  console.log("\nОшибки страницы:");
  for (const e of [...new Set(errors)].slice(0, 8)) console.log("  " + e);
}
process.exit(failed ? 1 : 0);
