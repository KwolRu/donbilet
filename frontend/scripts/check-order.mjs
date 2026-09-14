/**
 * UI-проверка первого шага заказа: геометрия 1920px, выбор мест и переключение
 * режима. Запуск: BASE_URL=http://localhost:3002 node scripts/check-order.mjs
 */
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const baseUrl = process.env.BASE_URL || "http://localhost:3000";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1920, height: 1371 } });
const errors = [];

page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});
page.on("pageerror", (error) => errors.push(String(error)));

try {
  const response = await page.goto(`${baseUrl}/order`, {
    waitUntil: "networkidle",
    timeout: 60_000,
  });
  if (!response?.ok()) throw new Error(`/order вернул ${response?.status() ?? "нет ответа"}`);

  await page.getByRole("heading", { name: "Покупка билета" }).waitFor();
  await page
    .getByRole("status", { name: "Загрузка сайта" })
    .waitFor({ state: "detached", timeout: 5_000 });

  const bodyWidth = await page.locator("body").evaluate((element) => element.scrollWidth);
  if (bodyWidth !== 1920) throw new Error(`горизонтальный overflow: ${bodyWidth}px`);

  const assertBox = async (locator, expected, label) => {
    const box = await locator.boundingBox();
    if (!box) throw new Error(`${label}: элемент не найден`);

    for (const [key, value] of Object.entries(expected)) {
      if (Math.abs(box[key] - value) > 1) {
        throw new Error(`${label}: ожидалось ${key}=${value}px, получено ${box[key]}px`);
      }
    }
  };

  await assertBox(page.locator("[data-order-container]"), { x: 350, width: 1220 }, "контейнер заказа");
  await assertBox(
    page.getByRole("button", { name: "Автоматический выбор мест" }).locator(".."),
    { width: 609, height: 40 },
    "переключатель выбора мест",
  );
  const selectorFrame = page.getByRole("button", { name: "Автоматический выбор мест" }).locator("..");
  const selectorFrameStyle = await selectorFrame.evaluate((element) => {
    const style = getComputedStyle(element);
    return { borderWidth: style.borderTopWidth, boxShadow: style.boxShadow };
  });
  if (selectorFrameStyle.borderWidth !== "0px" || selectorFrameStyle.boxShadow !== "none") {
    throw new Error(`неверная рамка переключателя: ${JSON.stringify(selectorFrameStyle)}`);
  }
  await assertBox(page.locator("[data-order-seat-map]"), { width: 664, height: 264 }, "схема мест");
  if ((await page.getByLabel("Место недоступно").count()) !== 8) {
    throw new Error("схема должна содержать ровно 8 заштрихованных недоступных мест");
  }
  await assertBox(page.locator("[data-order-summary-top]"), { width: 445 }, "верхняя часть заказа");
  await assertBox(page.locator("[data-order-summary-bottom]"), { width: 445 }, "нижняя часть заказа");

  const topSummaryBox = await page.locator("[data-order-summary-top]").boundingBox();
  const bottomSummaryBox = await page.locator("[data-order-summary-bottom]").boundingBox();
  if (!topSummaryBox || !bottomSummaryBox || Math.abs(topSummaryBox.x - bottomSummaryBox.x) > 1) {
    throw new Error("верхняя и нижняя части заказа не выровнены по левой границе");
  }

  const accountButton = page.getByRole("button", { name: "Личный кабинет" });
  const accountBackground = await accountButton.evaluate(
    (element) => getComputedStyle(element).backgroundColor,
  );
  if (accountBackground !== "rgb(255, 199, 0)") {
    throw new Error(`кнопка профиля должна быть жёлтой, получено ${accountBackground}`);
  }
  if (!(await accountButton.locator(".lucide-circle-user-round").count())) {
    throw new Error("в кнопке профиля нет иконки человека в окружности");
  }

  const progressStepsUseRoundPill = await page
    .locator("[data-order-progress-step]")
    .evaluateAll((steps) =>
      steps.every(
        (step) => step.classList.contains("rounded-full") && !step.classList.contains("squircle"),
      ),
    );
  if (!progressStepsUseRoundPill) {
    throw new Error("этапы оформления должны использовать обычное rounded-full");
  }

  const footerBox = await page.locator("footer").boundingBox();
  if (!footerBox || Math.abs(footerBox.y - 1036) > 2) {
    throw new Error(`футер должен начинаться на 1036px, получено ${footerBox?.y ?? "нет"}`);
  }

  for (const seat of [25, 29, 30]) {
    const button = page.getByRole("button", { name: `Место ${seat}, выбрано` });
    if ((await button.getAttribute("aria-pressed")) !== "true") {
      throw new Error(`место ${seat} не выбрано в начальном состоянии`);
    }
  }

  const continueButton = page.getByRole("button", { name: "Ввести данные пассажиров" });
  await assertBox(continueButton, { height: 56 }, "кнопка перехода к пассажирам");
  if (await continueButton.isDisabled()) throw new Error("кнопка продолжения должна быть доступна");

  await page.getByRole("button", { name: "Место 25, выбрано" }).click();
  if (!(await page.getByRole("button", { name: "Сначала выберите три места" }).isDisabled())) {
    throw new Error("кнопка продолжения не отключилась после снятия места");
  }

  await page.getByRole("button", { name: "Место 24" }).click();
  if (await continueButton.isDisabled()) throw new Error("кнопка не включилась после выбора третьего места");

  await page.getByRole("button", { name: "Автоматический выбор мест" }).click();
  await page.getByText("Выберите количество пассажиров").waitFor();
  if (await page.locator("[data-order-seat-map]").isVisible()) {
    throw new Error("схема мест осталась видна в автоматическом режиме");
  }
  await assertBox(
    page.locator("[data-order-automatic-selection]").locator("div").first(),
    { width: 707 },
    "блок автоматического выбора",
  );
  await mkdir("shots/order", { recursive: true });
  await page.waitForTimeout(350);
  await page.screenshot({ path: "shots/order/order-automatic-1920.png", fullPage: true });

  await page.getByRole("button", { name: "Уменьшить количество пассажиров" }).click();
  if (
    (await page.getByRole("status", { name: "Количество пассажиров" }).textContent())?.trim() !==
    "2"
  ) {
    throw new Error("счётчик пассажиров не уменьшился");
  }
  if (!(await page.getByText("2 пасс").isVisible())) {
    throw new Error("количество пассажиров в карточке заказа не обновилось");
  }

  await page.getByRole("button", { name: "Увеличить количество пассажиров" }).click();

  // Эталонный кадр хранит состояние «Выбор из списка» с местами 25, 29, 30.
  await page.getByRole("button", { name: "Выбор из списка" }).click();

  await page.screenshot({ path: "shots/order/order-1920.png", fullPage: true });

  await continueButton.click();
  await page.getByRole("heading", { name: "Заполните данные" }).waitFor();
  if ((await page.locator("[data-order-passenger-card]").count()) !== 3) {
    throw new Error("на шаге пассажиров должны отображаться три карточки");
  }
  await assertBox(
    page.locator("[data-order-passenger-details]"),
    { width: 755 },
    "форма данных пассажиров",
  );

  await page.waitForTimeout(350);
  const passengerStepBackground = await page
    .getByRole("list", { name: "Этапы оформления" })
    .getByText("Пассажиры", { exact: true })
    .evaluate((element) => getComputedStyle(element).backgroundColor);
  if (passengerStepBackground !== "rgb(255, 199, 0)") {
    throw new Error(`этап «Пассажиры» должен быть жёлтым, получено ${passengerStepBackground}`);
  }

  await page.getByText("5 875 ₽").waitFor();
  const paymentButton = page.getByRole("button", { name: "Перейти к оплате" });
  if (await paymentButton.isDisabled()) throw new Error("кнопка перехода к оплате должна быть доступна");

  await page.getByRole("button", { name: "Выбрать пассажира" }).first().click();
  const passengerPicker = page.getByRole("dialog", { name: "Пассажиры" });
  await passengerPicker.waitFor();
  await assertBox(passengerPicker, { width: 476 }, "сайдбар выбора пассажира");
  if ((await passengerPicker.locator("[data-order-saved-passenger]").count()) !== 5) {
    throw new Error("в сайдбаре должны отображаться пять сохранённых пассажиров");
  }
  if ((await page.locator("body").evaluate((element) => getComputedStyle(element).overflow)) !== "hidden") {
    throw new Error("страница не заблокировала прокрутку при открытом сайдбаре");
  }
  await page.waitForTimeout(350);
  await page.screenshot({ path: "shots/order/order-passenger-picker-1920.png" });
  await passengerPicker.getByRole("button", { name: "Закрыть" }).click();
  await passengerPicker.waitFor({ state: "hidden" });

  const baggageInfo = page.getByRole("button", { name: "Условия провоза багажа" }).first();
  await baggageInfo.hover();
  const baggageTooltip = page.getByRole("tooltip");
  await baggageTooltip.waitFor();
  const baggageTooltipBox = await baggageTooltip.boundingBox();
  if (!baggageTooltipBox || baggageTooltipBox.width < 200) {
    throw new Error(`тултип багажа схлопнулся: ${baggageTooltipBox?.width ?? "нет"}px`);
  }
  await page.getByRole("heading", { name: "Заполните данные" }).hover();

  await page.getByRole("checkbox", { name: /данные пассажиров указаны верно/ }).click();
  if (!(await paymentButton.isDisabled())) {
    throw new Error("кнопка оплаты не отключилась после снятия обязательного согласия");
  }
  await page.getByRole("checkbox", { name: /данные пассажиров указаны верно/ }).click();
  await page.screenshot({ path: "shots/order/order-passengers-1920.png", fullPage: true });

  await paymentButton.click();
  await page.getByRole("heading", { name: "Оплата" }).waitFor();
  await assertBox(page.locator("[data-order-payment]"), { width: 755 }, "форма оплаты");
  if ((await page.getByRole("radio").count()) !== 4) {
    throw new Error("на шаге оплаты должны отображаться четыре способа оплаты");
  }

  await page.waitForTimeout(350);
  const paymentStepBackground = await page
    .getByRole("list", { name: "Этапы оформления" })
    .getByText("Оплата", { exact: true })
    .evaluate((element) => getComputedStyle(element).backgroundColor);
  if (paymentStepBackground !== "rgb(255, 199, 0)") {
    throw new Error(`этап «Оплата» должен быть жёлтым, получено ${paymentStepBackground}`);
  }

  if (!(await page.locator("[data-order-card-fields]").isVisible())) {
    throw new Error("поля карты не показаны для карты банка РФ");
  }
  await page.getByRole("radiogroup", { name: "Способ оплаты" }).getByText("СБП", { exact: true }).click();
  if (await page.locator("[data-order-card-fields]").isVisible()) {
    throw new Error("поля карты остались видны для оплаты через СБП");
  }
  await page
    .getByRole("radiogroup", { name: "Способ оплаты" })
    .getByText("Карта банка РФ", { exact: true })
    .click();

  await page.getByRole("button", { name: "Очистить промокод" }).click();
  if (await page.getByText("Скидка 10% по промокоду применена").isVisible()) {
    throw new Error("сообщение о скидке осталось после очистки промокода");
  }
  await page.getByLabel("Промокод").fill("OSEN10");
  await page.getByRole("button", { name: "Применить" }).click();
  await page.getByText("Скидка 10% по промокоду применена").waitFor();

  if (await page.getByRole("button", { name: "Оплатить" }).isDisabled()) {
    throw new Error("кнопка оплаты должна быть доступна");
  }
  await page.screenshot({ path: "shots/order/order-payment-1920.png", fullPage: true });

  if (errors.length) throw new Error(`ошибки браузера:\n${errors.join("\n")}`);

  const scaledPage = await browser.newPage({ viewport: { width: 1710, height: 979 } });
  await scaledPage.goto(`${baseUrl}/order`, { waitUntil: "networkidle", timeout: 60_000 });
  await scaledPage
    .getByRole("status", { name: "Загрузка сайта" })
    .waitFor({ state: "detached", timeout: 5_000 });

  const scaledBodyWidth = await scaledPage.locator("body").evaluate((element) => element.scrollWidth);
  if (scaledBodyWidth !== 1710) throw new Error(`overflow после масштабирования: ${scaledBodyWidth}px`);
  await assertBox(
    scaledPage.locator("[data-order-container]"),
    { x: 311.71875, width: 1086.5625 },
    "масштабированный контейнер заказа",
  );
  await assertBox(scaledPage.locator("footer"), { y: 922.6875 }, "масштабированный футер");
  await scaledPage.screenshot({ path: "shots/order/order-1710.png" });
  await scaledPage.close();

  console.log(`OK ${baseUrl}/order — layout 1920/1710, seats, modes`);
} finally {
  await browser.close();
}
