"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Pencil } from "lucide-react";

import { DbButton } from "@/components/ui/db-button";
import { DbCheckbox } from "@/components/ui/db-checkbox";
import { DbField } from "@/components/ui/db-field";
import { DbOtpInput } from "@/components/ui/db-otp-input";
import { DbTooltip } from "@/components/ui/db-tooltip";
import { ACCOUNT_ROUTES, PUBLIC_ROUTES } from "@/lib/routing/public-paths";
import {
  looksLikeEmail,
  registerProfile,
  requestCode,
  startMockSession,
  submitCode,
} from "@app/core/mocks/auth";

/**
 * Карточка входа: почта → код → согласия для нового профиля.
 *
 * Все три шага живут в одной карточке 476px и сменяют друг друга — так в
 * макете, отдельных страниц под шаги нет. Состояние держится здесь: пока это
 * единственный экран, которому оно нужно. С появлением реального API логика
 * переезжает в `core/store/auth`, разметка остаётся.
 *
 * Данные моковые (`core/mocks/auth`): стенд API ДонБилет не отвечает.
 */

type Step = "email" | "code" | "register";

/** Подсказка-ошибка из макета: тёмная плашка с хвостиком вниз. */
/** Подсказка об ошибке над полем — общий тултип с хвостиком. */
function Hint({ children }: { children: string }) {
  return <DbTooltip role="alert">{children}</DbTooltip>;
}

export function LoginCard() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [dataConsent, setDataConsent] = useState(false);
  const reduced = useReducedMotion();
  const router = useRouter();

  /**
   * Куда идти после входа.
   *
   * `?from=` ставит гейт `proxy.ts`, когда разворачивает с закрытой страницы, —
   * туда и возвращаем. Адрес читается из `location`, а не через
   * `useSearchParams`: тот требует обёртки в `Suspense` и уводит страницу из
   * статики ради одного параметра, который нужен только в обработчике клика.
   *
   * Берём только собственные пути: чужой адрес в параметре превратил бы вход
   * в открытый редиректор. Та же проверка есть и в `proxy.ts` — здесь она
   * повторена, потому что переход отсюда идёт мимо гейта.
   */
  function destination(): string {
    const from = new URLSearchParams(window.location.search).get("from");
    const safe = from && from.startsWith("/") && !from.startsWith("//") ? from : null;
    return safe ?? ACCOUNT_ROUTES.root;
  }

  /** Общий финал обоих сценариев: открыть сессию и уйти в кабинет. */
  function enterAccount() {
    startMockSession();
    const target = destination();
    router.replace(target);
    // Серверные компоненты кабинета рисуются с учётом cookie — без обновления
    // роутер отдал бы страницу, отрисованную до входа.
    router.refresh();
  }

  async function sendCode() {
    if (!looksLikeEmail(email)) {
      setEmailError("Без телефона или почты код не отправить");
      return;
    }
    setEmailError(null);
    setPending(true);
    try {
      await requestCode(email);
      setCode("");
      setStep("code");
    } finally {
      setPending(false);
    }
  }

  async function confirmCode(next: string) {
    setCode(next);
    setCodeError(null);
    if (next.length < 4) return;

    setPending(true);
    try {
      const result = await submitCode(email, next);
      if (result === "invalid") {
        setCodeError("Похоже, код не подошёл. Проверьте и попробуйте ещё раз");
        return;
      }
      if (result === "registration-required") {
        setStep("register");
        return;
      }

      setCodeError(null);
      enterAccount();
    } finally {
      setPending(false);
    }
  }

  /** Регистрация нового профиля: согласия → сессия → кабинет. */
  async function createProfile() {
    if (!dataConsent) return;

    setPending(true);
    try {
      await registerProfile(email, { data: dataConsent, marketing: marketingConsent });
      enterAccount();
    } catch {
      setCodeError("Не удалось создать профиль. Попробуйте ещё раз");
    } finally {
      setPending(false);
    }
  }

  const transition = { duration: reduced ? 0 : 0.3, ease: [0.22, 1, 0.36, 1] as const };

  return (
    <div className="squircle flex w-[476px] flex-col items-end gap-4 rounded-db-xl bg-db-surface-default p-6 outline outline-1 -outline-offset-1 outline-db-border-default">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={step}
          initial={reduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduced ? undefined : { opacity: 0, y: -8 }}
          transition={transition}
          className="flex w-full flex-col items-end gap-4"
        >
          {step === "email" ? (
            <>
              <div className="flex w-full flex-col gap-2">
                <h1 className="text-[30px] leading-9 font-medium text-db-text-primary">
                  Войдите в профиль
                </h1>
                <p className="text-[16px] leading-5 text-db-text-secondary">
                  Чтобы сохранять свои билеты и данные о пассажирах, сохранять рейсы в избранное
                  и иметь к ним быстрый доступ
                </p>
              </div>

              <div className="flex w-full flex-col gap-3">
                <div className="relative w-full">
                  <AnimatePresence>{emailError && <Hint>{emailError}</Hint>}</AnimatePresence>
                  <DbField
                    label="Ваша почта"
                    type="email"
                    autoComplete="email"
                    value={email}
                    invalid={Boolean(emailError)}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      setEmailError(null);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") void sendCode();
                    }}
                  />
                </div>

                <DbButton
                  variant="primary"
                  size="large"
                  fullWidth
                  disabled={pending}
                  onClick={() => void sendCode()}
                >
                  Отправить код
                </DbButton>
              </div>

              <p className="w-full text-[14px] leading-4 text-db-text-primary">
                или войдите с помощью
              </p>

              <div className="flex w-full flex-col gap-3">
                <DbButton variant="secondary" size="large" fullWidth>
                  VK ID
                </DbButton>
                <DbButton variant="secondary" size="large" fullWidth>
                  Яндекс ID
                </DbButton>
              </div>

              <p className="w-full text-[14px] leading-4 text-db-text-secondary">
                Нажимая кнопку «Отправить код», вы принимаете{" "}
                <a href={PUBLIC_ROUTES.publicOffer} className="underline">
                  пользовательское соглашение
                </a>{" "}
                <a href={PUBLIC_ROUTES.privacyPolicy} className="underline">
                  Политика обработки персональных данных
                </a>
              </p>
            </>
          ) : (
            <>
              <div className="flex w-full flex-col gap-2">
                <h1 className="text-[30px] leading-9 font-medium text-db-text-primary">
                  Подтвердите вход
                </h1>
                <div className="flex items-start gap-3">
                  <p className="text-[16px] leading-5 text-db-text-secondary">
                    Отправили код на{" "}
                    <span className="font-semibold text-db-text-primary">{email}</span>
                  </p>
                  <button
                    type="button"
                    aria-label="Изменить почту"
                    onClick={() => {
                      setStep("email");
                      setCode("");
                      setCodeError(null);
                    }}
                    className="mt-0.5 shrink-0 transition-opacity duration-300 ease-out hover:opacity-60"
                  >
                    <Pencil className="size-4 text-db-text-secondary" strokeWidth={1.5} aria-hidden />
                  </button>
                </div>
              </div>

              <div className="relative w-full">
                <AnimatePresence>{codeError && <Hint>{codeError}</Hint>}</AnimatePresence>
                <DbOtpInput
                  value={code}
                  onChange={(next) => void confirmCode(next)}
                  invalid={Boolean(codeError)}
                  autoFocus
                />
              </div>

              {step === "register" && (
                <>
                  <div className="flex w-full flex-col gap-3">
                    <DbCheckbox checked={dataConsent} onChange={setDataConsent}>
                      Соглашаюсь{" "}
                      <a href={PUBLIC_ROUTES.personalDataConsent} className="underline">
                        на обработку персональных данных
                      </a>
                    </DbCheckbox>

                    <DbCheckbox checked={marketingConsent} onChange={setMarketingConsent}>
                      Соглашаюсь получать рекламные и информационные сообщения об акциях, скидках
                      и специальных предложениях
                    </DbCheckbox>
                  </div>

                  <DbButton
                    variant="primary"
                    size="large"
                    fullWidth
                    disabled={!dataConsent || pending}
                    onClick={() => void createProfile()}
                  >
                    {pending ? "Создаём профиль…" : "Создать новый профиль"}
                  </DbButton>
                </>
              )}

              <a
                href={PUBLIC_ROUTES.personalDataConsent}
                className="w-full text-[14px] leading-4 text-db-text-secondary underline"
              >
                Политика обработки персональных данных
              </a>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
