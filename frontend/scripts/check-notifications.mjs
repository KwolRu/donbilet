/**
 * Проверка раздела «Уведомления».
 *
 * `/profile/messages` закрыт гейтом `proxy.ts` по cookie `access_token` —
 * перед заходом ставим её вручную, как в `check-profile.mjs`.
 *
 *   node scripts/check-notifications.mjs
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

await page.goto(`${base}/profile/messages`, { waitUntil: "networkidle", timeout: 60_000 });

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
  "раздел открывается с пустым состоянием",
  async () => {
    await page.getByRole("heading", { name: "Уведомления" }).waitFor({ timeout: 5000 });
    await page.getByText("чтобы начать переписку").waitFor({ timeout: 4000 });
    await page.getByRole("button", { name: "Создать обращение" }).waitFor({ timeout: 4000 });
  },
  "notifications-empty.png",
);

await step(
  "уведомление открывается и показывает переписку",
  async () => {
    await page.getByRole("button", { name: /Рейс отменён/ }).click();
    await page.getByText("Ваш возврат по билету № BN-8374-54558 одобрен").first().waitFor({
      timeout: 4000,
    });
    // Системному уведомлению отвечать некому — вместо поля ввода плашка.
    await page.getByText("Это информационное сообщение").waitFor({ timeout: 4000 });
    if (await page.getByRole("textbox", { name: "Введите сообщение" }).count()) {
      throw new Error("у системного уведомления показано поле ответа");
    }
  },
  "notifications-thread.png",
);

await step(
  "у обращения есть поле ответа и сообщение отправляется",
  async () => {
    await page.getByRole("button", { name: /Возврат билета/ }).first().click();
    const input = page.getByRole("textbox", { name: "Введите сообщение" });
    await input.waitFor({ timeout: 4000 });

    const before = await page.locator("p.whitespace-pre-line").count();
    await input.fill("Проверка отправки");
    await page.getByRole("button", { name: "Отправить сообщение" }).click();
    await page.waitForTimeout(500);

    const after = await page.locator("p.whitespace-pre-line").count();
    if (after !== before + 1) throw new Error(`сообщение не добавилось: ${before} → ${after}`);
  },
  "notifications-reply.png",
);

await step("поиск сужает список уведомлений", async () => {
  const search = page.getByRole("textbox", { name: "Поиск по уведомлениям" });
  const before = await page.locator("aside, ul li button[aria-current]").count();
  await search.fill("Рейс перенесён");
  await page.waitForTimeout(600);

  const found = await page.getByRole("button", { name: /Рейс перенесён/ }).count();
  if (found !== 1) throw new Error(`ожидалось одно уведомление, найдено ${found}`);

  await page.getByRole("button", { name: "Очистить поиск" }).click();
  await page.waitForTimeout(600);
  if (before === 0 && (await page.getByRole("button", { name: /Рейс отменён/ }).count()) === 0) {
    throw new Error("список не восстановился после очистки поиска");
  }
});

await step(
  "обращение создаётся через панель поддержки",
  async () => {
    await page.getByRole("button", { name: "Создать обращение" }).click();
    await page.getByRole("heading", { name: "Обращение в поддержку" }).waitFor({ timeout: 4000 });

    const submit = page.getByRole("button", { name: "Отправить", exact: true });
    if (!(await submit.isDisabled())) throw new Error("кнопка активна без темы и текста");

    await page.getByRole("button", { name: "Тема обращения" }).click();
    await page.getByRole("button", { name: "Оплата" }).click();
    // По placeholder: у общего `Textarea` подпись стоит рядом с полем и в
    // доступное имя не попадает.
    await page.getByPlaceholder("Опишите, что случилось").fill("Не прошла оплата картой");
    await page.waitForTimeout(300);
    if (await submit.isDisabled()) throw new Error("кнопка осталась заблокированной");
  },
  "notifications-support.png",
);

await step("новое обращение встаёт в начало списка и открыто", async () => {
  await page.getByRole("button", { name: "Отправить", exact: true }).click();
  await page.getByRole("heading", { name: "Обращение в поддержку" }).waitFor({
    state: "hidden",
    timeout: 6000,
  });
  await page.getByText("Не прошла оплата картой").first().waitFor({ timeout: 4000 });
  await page.getByRole("textbox", { name: "Введите сообщение" }).waitFor({ timeout: 4000 });
});

await step("прокручивается лента сообщений, а не страница", async () => {
  const pageScroll = await page.evaluate(() => {
    const main = document.querySelector("main");
    return main ? main.scrollHeight - main.clientHeight : -1;
  });
  if (pageScroll > 4) throw new Error(`рабочая область прокручивается на ${pageScroll}px`);
});

await browser.close();

console.log("Уведомления:\n");
console.log(results.join("\n"));
const failed = results.filter((r) => r.includes("✘")).length;
console.log(`\n${results.length - failed} passed, ${failed} failed`);
if (errors.length) {
  console.log("\nОшибки страницы:");
  for (const e of [...new Set(errors)].slice(0, 8)) console.log("  " + e);
}
process.exit(failed ? 1 : 0);
