/**
 * Проверка раздела «Мои билеты».
 *
 * `/profile/tickets` закрыт гейтом `proxy.ts` по cookie `access_token` —
 * перед заходом ставим её вручную, как в `check-profile.mjs`.
 *
 *   node scripts/check-tickets.mjs
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

await page.goto(`${base}/profile/tickets`, { waitUntil: "networkidle", timeout: 60_000 });

const results = [];
async function step(name, action, shot) {
  try {
    await action();
    await page.waitForTimeout(600);
    if (shot) await page.screenshot({ path: `shots/${shot}`, fullPage: Boolean(shot.full) });
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
  "список предстоящих поездок открыт",
  async () => {
    await page.getByRole("heading", { name: "Мои билеты" }).waitFor({ timeout: 4000 });
    await page.getByText("Санкт-Петербург - Краснодар").first().waitFor({ timeout: 4000 });
    await page.getByText("Не оплачено").first().waitFor({ timeout: 4000 });
  },
  "tickets-upcoming.png",
);

await step(
  "блок пассажиров раскрывается",
  async () => {
    await page.getByRole("button", { name: /3 пасс/ }).first().click();
    await page
      .getByText("Демьяненко Константин Владимирович")
      .first()
      .waitFor({ state: "visible", timeout: 4000 });
  },
  "tickets-passengers.png",
);

await step("фильтр по транспорту сужает список", async () => {
  const before = await page.locator("article").count();
  await page.getByRole("button", { name: "Самолет", exact: true }).click();
  await settle();
  const after = await page.locator("article").count();
  if (after >= before) throw new Error(`фильтр не сработал: было ${before}, стало ${after}`);
  await page.getByRole("button", { name: "Все", exact: true }).click();
  await settle();
});

await step(
  "поиск показывает заставку, пока собирает подборку",
  async () => {
    await page.getByRole("textbox", { name: "Поиск по билетам" }).fill("Крас");
    await loader().waitFor({ state: "visible", timeout: 3000 });
  },
  "tickets-searching.png",
);

await step("после поиска заставка уходит", async () => {
  await settle();
  if (await loader().isVisible()) throw new Error("заставка осталась на экране");
  await page.getByRole("textbox", { name: "Поиск по билетам" }).fill("");
  await settle();
});

await step(
  "пустой результат объясняет причину",
  async () => {
    await page.getByRole("textbox", { name: "Поиск по билетам" }).fill("привет");
    await settle();
    await page.getByRole("heading", { name: /По запросу «привет»/ }).waitFor({ timeout: 4000 });
  },
  "tickets-empty.png",
);

await step("кнопка в пустом состоянии возвращает список", async () => {
  await page.getByRole("button", { name: "Показать все поездки" }).click();
  await settle();
  const count = await page.locator("article").count();
  if (count === 0) throw new Error("сброс не вернул список");
});

await step("поиск по маршруту находит заказ", async () => {
  await page.getByRole("textbox", { name: "Поиск по билетам" }).fill("Казань");
  await settle();
  const count = await page.locator("article").count();
  if (count !== 1) throw new Error(`ожидалась одна карточка, найдено ${count}`);
  await page.getByRole("textbox", { name: "Поиск по билетам" }).fill("");
  await settle();
});

await step(
  "сортировка открывается и меняется",
  async () => {
    // Поле сортировки — общий `DbSelectField` без видимой подписи: его имя
    // живёт в `aria-label`, а значение показано текстом внутри.
    const sortField = page.getByRole("button", { name: "Сортировка" });
    await sortField.click();
    await page.getByRole("button", { name: "Сначала дорогие" }).click();
    await settle();

    if (!(await sortField.textContent())?.includes("Сначала дорогие")) {
      throw new Error("значение сортировки не обновилось");
    }
  },
  "tickets-sort.png",
);

await step(
  "панель возврата открывается и считает сумму",
  async () => {
    await page.getByRole("button", { name: "Вернуть билет" }).first().click();
    await page.getByRole("heading", { name: "Возврат билета" }).waitFor({ timeout: 4000 });
    // Трое выбраны по умолчанию: 3 × 2 450 − 5% = 6 982 ₽.
    await page.getByText("6 982 ₽").first().waitFor({ timeout: 4000 });
  },
  "tickets-refund.png",
);

await step(
  "возврат подтверждается и показывает итог",
  async () => {
    await page.getByRole("button", { name: "Подтвердить" }).click();
    await page.getByText("Возврат оформлен").waitFor({ timeout: 4000 });
    await page.getByRole("button", { name: "Готово" }).click();
    await page.getByText("Возврат оформлен").waitFor({ state: "hidden", timeout: 4000 });
  },
  "tickets-refund-done.png",
);

await step(
  "вкладка «Завершённые» показывает строки поездок",
  async () => {
    await page.getByRole("button", { name: "Завершённые" }).click();
    await settle();
    await page.getByRole("button", { name: "Оцените поездку" }).first().waitFor({ timeout: 4000 });
  },
  "tickets-completed.png",
);

await step("раскрытая поездка сворачивается стрелкой", async () => {
  await page.getByRole("button", { name: "Свернуть поездку" }).click();
  await page.waitForTimeout(500);
  if (await page.getByRole("button", { name: "Свернуть поездку" }).count()) {
    throw new Error("карточка осталась раскрытой");
  }
});

await step("оценка открывается кликом по рейтингу, а не стрелкой", async () => {
  await page.getByRole("button", { name: "Изменить оценку поездки" }).first().click();
  await page
    .getByRole("heading", { name: "Оцените поездку по критериям" })
    .waitFor({ timeout: 4000 });
  await page.getByRole("button", { name: "Отмена" }).click();
  await page.waitForTimeout(400);
});

await step("поиск очищается крестиком", async () => {
  await page.getByRole("textbox", { name: "Поиск по билетам" }).fill("Казань");
  await page.getByRole("button", { name: "Очистить поиск" }).click();
  await settle();
  const value = await page.getByRole("textbox", { name: "Поиск по билетам" }).inputValue();
  if (value !== "") throw new Error(`поле не очистилось: «${value}»`);
});

await step(
  "оценка выставляется и попадает в список",
  async () => {
    await page.getByRole("button", { name: "Оцените поездку" }).first().click();
    await page
      .getByRole("heading", { name: "Оцените поездку по критериям" })
      .waitFor({ timeout: 4000 });

    for (const criterion of ["Критерий 01", "Критерий 02", "Критерий 03", "Критерий 04"]) {
      await page.getByRole("button", { name: `${criterion}: 5 из 5` }).click();
    }

    await page.getByRole("button", { name: "Подтвердить" }).click();
    await page.getByText("5/5").first().waitFor({ timeout: 4000 });
  },
  "tickets-rated.png",
);

await browser.close();

console.log("Мои билеты:\n");
console.log(results.join("\n"));
const failed = results.filter((r) => r.includes("✘")).length;
console.log(`\n${results.length - failed} passed, ${failed} failed`);
if (errors.length) {
  console.log("\nОшибки страницы:");
  for (const e of [...new Set(errors)].slice(0, 8)) console.log("  " + e);
}
process.exit(failed ? 1 : 0);
