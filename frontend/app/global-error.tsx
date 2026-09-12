"use client";

import "@assets/styles/index.css";

import { ErrorLayout } from "@/components/layout/error-layout";
import { PageErrorFallback } from "@/components/ui/page-error-fallback";

/**
 * Последний рубеж: ошибка в самом root layout. Next.js заменяет всё дерево на
 * этот файл, поэтому `<html>`/`<body>` рисуем сами и стили импортируем здесь же.
 *
 * Переменная `--font-inter` задаётся в root layout, до которого дело не дошло,
 * поэтому текст отрисуется системным шрифтом — сознательный размен: тащить
 * сюда `next/font` ради страницы, которая почти никогда не показывается, дороже.
 */
export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="ru" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <ErrorLayout>
          <PageErrorFallback onRetry={reset} />
        </ErrorLayout>
      </body>
    </html>
  );
}
