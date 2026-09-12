import type { Metadata } from "next";

import { ErrorLayout } from "@/components/layout/error-layout";
import { PageErrorFallback } from "@/components/ui/page-error-fallback";

/**
 * Страница «сервис недоступен».
 *
 * Сюда уводит браузерный обработчик 5xx (`lib/routing/server-error-browser.ts`)
 * с `?returnUrl=<откуда пришли>`; кнопка возвращает по этому адресу.
 * Лежит вне группы `(public)` — у страниц ошибок свой шелл `ErrorLayout`.
 */
export const metadata: Metadata = {
  title: "Ошибка сервера — ДонБилет",
  robots: { index: false, follow: false },
};

export default function ServerErrorPage() {
  return (
    <ErrorLayout>
      <PageErrorFallback kind="server" />
    </ErrorLayout>
  );
}
