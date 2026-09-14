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

/**
 * Создание профиля новым пользователем. Согласие на обработку данных
 * обязательно (152-ФЗ), рекламная рассылка — нет.
 */
export async function registerProfile(
  email: string,
  consents: { data: boolean; marketing: boolean },
): Promise<void> {
  await delay(600);
  if (!consents.data) throw new Error("Нужно согласие на обработку персональных данных");
  if (!looksLikeEmail(email)) throw new Error("Некорректный адрес");
}

/**
 * Открыть сессию до появления настоящей авторизации.
 *
 * Настоящую сессию заводит gateway: он ставит httpOnly-cookie `access_token`,
 * и фронт их не читает и не пишет. Здесь cookie ставится из браузера, потому
 * что ставить её больше некому — без неё гейт `proxy.ts` развернёт обратно на
 * `/login`, и вход никуда не приведёт.
 *
 * Cookie не httpOnly и без подписи — это заглушка витрины, а не авторизация.
 * С подключением API (блокер B1) функция удаляется целиком: её вызовы
 * заменяются ответом `POST /api/auth/*`.
 */
export function startMockSession(): void {
  // Сутки: столько живёт демо-сессия, чтобы витрину можно было показывать,
  // не входя заново на каждой вкладке.
  document.cookie = `access_token=mock-session; path=/; max-age=${60 * 60 * 24}; SameSite=Lax`;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
