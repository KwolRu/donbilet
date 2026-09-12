/**
 * Мок авторизации до появления рабочего API (блокер B1).
 *
 * Заменяет собой будущие вызовы `core/api/auth`: формы и состояния экрана
 * уже настоящие, меняется только источник ответов.
 */

/** Почта, за которой «уже есть профиль»: после кода такой пользователь входит. */
export const MOCK_KNOWN_EMAIL = "m.chernyshev@mail.ru";

/** Код, который мок считает верным. Любой другой даёт ошибку. */
export const MOCK_VALID_CODE = "1234";

export type CodeResult = "signed-in" | "registration-required" | "invalid";

/** Простая проверка: нам нужно отличить «похоже на адрес» от пустой строки. */
export function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

/**
 * Что произойдёт после ввода кода.
 *
 * Известной почте — вход, новой — шаг регистрации с согласиями, неверному
 * коду — ошибка. Задержка имитирует сеть: без неё кнопка «Отправить код»
 * срабатывает мгновенно, и состояние загрузки нечем проверить.
 */
export async function submitCode(email: string, code: string): Promise<CodeResult> {
  await delay(600);
  if (code !== MOCK_VALID_CODE) return "invalid";
  return email.trim().toLowerCase() === MOCK_KNOWN_EMAIL ? "signed-in" : "registration-required";
}

export async function requestCode(email: string): Promise<void> {
  await delay(600);
  if (!looksLikeEmail(email)) throw new Error("Некорректный адрес");
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
