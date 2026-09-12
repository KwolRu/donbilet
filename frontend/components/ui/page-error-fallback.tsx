"use client";

import { usePathname, useRouter } from "next/navigation";

import { getRouteLabel } from "@app/core/configs/routes";
import { DbButton } from "@/components/ui/db-button";
import { getServerErrorReturnPath } from "@/lib/routing/server-error-policy";

/**
 * Содержимое страницы ошибки: код, заголовок, пояснение и одно действие.
 *
 * Иллюстрации нет намеренно — вместо неё крупный код ошибки фирменным жёлтым.
 * Шелл (логотип, фон, копирайт) задаёт `ErrorLayout`, здесь только карточка,
 * поэтому этот же компонент подходит и для встроенного fallback'а внутри
 * шапки приложения (`ServerErrorBoundary`).
 */

type PageErrorFallbackProps = {
  kind?: "page" | "server" | "not-found";
  onRetry?: () => void;
};

export function PageErrorFallback({ kind = "page", onRetry }: PageErrorFallbackProps) {
  const pathname = usePathname();
  const router = useRouter();
  const routeLabel = getRouteLabel(pathname);

  const content =
    kind === "not-found"
      ? {
          code: "404",
          title: "Страница не найдена",
          description:
            "Возможно, она была удалена или адрес указан неверно. Начните с главной — расписание и билеты на месте.",
          action: "На главную",
        }
      : kind === "server"
        ? {
            code: "500",
            title: "Ошибка сервера",
            description:
              "Сервис временно недоступен. Мы уже знаем о проблеме и чиним. Попробуйте повторить через минуту.",
            action: "Попробовать снова",
          }
        : {
            code: null,
            title:
              routeLabel === "этой странице"
                ? "На странице возникла ошибка"
                : `На странице «${routeLabel}» возникла ошибка`,
            description: "Перезагрузите страницу — обычно это помогает.",
            action: "Перезагрузить",
          };

  const handleAction = () => {
    if (kind === "not-found") {
      router.push("/");
      return;
    }

    if (kind === "server") {
      window.location.replace(getServerErrorReturnPath(window.location.search));
      return;
    }

    if (onRetry) {
      onRetry();
      router.refresh();
      return;
    }

    window.location.reload();
  };

  return (
    <section
      className="squircle flex w-full max-w-[720px] flex-col items-center rounded-db-xl bg-db-surface-default px-8 py-14 text-center"
      aria-labelledby="page-error-title"
    >
      {content.code ? (
        <p
          className="text-[96px] font-medium leading-none text-db-surface-base"
          aria-hidden
        >
          {content.code}
        </p>
      ) : null}

      <h1
        id="page-error-title"
        className="mt-6 text-db-section font-medium text-db-text-primary"
      >
        {content.title}
      </h1>

      <p className="mt-3 max-w-[460px] text-db-prose text-db-text-secondary">
        {content.description}
      </p>

      <DbButton className="mt-8" size="large" onClick={handleAction}>
        {content.action}
      </DbButton>
    </section>
  );
}
