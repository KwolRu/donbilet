"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { SERVER_ERROR_EVENT } from "@/lib/routing/server-error-policy";
import { ErrorLayout } from "@/components/layout/error-layout";
import { PageErrorFallback } from "@/components/ui/page-error-fallback";

/**
 * Ловит событие «сервер недоступен» (его шлёт axios-интерсептор) и подменяет
 * содержимое на fallback. `variant` выбирает, рисовать ли fallback внутри
 * шелла приложения (сайдбар/шапка остаются) или на всю страницу.
 *
 * `key={pathname}` сбрасывает состояние ошибки при переходе — иначе один
 * упавший запрос заблокировал бы все последующие страницы.
 */
export function ServerErrorBoundary({
  children,
  variant = "app-shell",
}: {
  children: React.ReactNode;
  variant?: "app-shell" | "full-page";
}) {
  const pathname = usePathname();

  return (
    <ServerErrorBoundaryForPath key={pathname} variant={variant}>
      {children}
    </ServerErrorBoundaryForPath>
  );
}

function ServerErrorBoundaryForPath({
  children,
  variant,
}: {
  children: React.ReactNode;
  variant: "app-shell" | "full-page";
}) {
  const [hasServerError, setHasServerError] = useState(false);

  useEffect(() => {
    const showFallback = () => setHasServerError(true);
    window.addEventListener(SERVER_ERROR_EVENT, showFallback);
    return () => window.removeEventListener(SERVER_ERROR_EVENT, showFallback);
  }, []);

  if (hasServerError) {
    if (variant === "full-page") {
      return (
        <ErrorLayout>
          <PageErrorFallback />
        </ErrorLayout>
      );
    }

    return (
      <div className="flex min-h-full flex-1 items-center justify-center p-6">
        <PageErrorFallback />
      </div>
    );
  }

  return children;
}
