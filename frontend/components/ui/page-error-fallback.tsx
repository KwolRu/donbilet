"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";

import errorImage from "@/assets/images/image.png";
import { getRouteLabel } from "@app/core/configs/routes";
import { Button } from "@/components/ui/button";
import { getServerErrorReturnPath } from "@/lib/routing/server-error-policy";

type PageErrorFallbackProps = {
  kind?: "page" | "server" | "not-found";
  onRetry?: () => void;
};

export function PageErrorFallback({
  kind = "page",
  onRetry,
}: PageErrorFallbackProps) {
  const pathname = usePathname();
  const router = useRouter();
  const routeLabel = getRouteLabel(pathname);

  const content =
    kind === "not-found"
      ? {
          eyebrow: "404",
          title: "Страница не найдена",
          description: "Возможно, она была удалена или адрес указан неверно.",
          action: "На главную",
        }
      : kind === "server"
        ? {
            eyebrow: "500",
            title: "Ошибка сервера",
            description:
              "К сожалению, сервис авторизации временно недоступен. Попробуйте ещё раз.",
            action: "Перезагрузить",
          }
        : {
            eyebrow: null,
            title:
              routeLabel === "этой странице"
                ? "К сожалению, возникла ошибка на этой странице"
                : `К сожалению, на странице «${routeLabel}» возникла ошибка`,
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
      className="flex min-h-[360px] w-full flex-1 items-center justify-center overflow-auto rounded-3xl bg-white px-6 py-10"
      aria-labelledby="page-error-title"
    >
      <div className="flex w-full max-w-[680px] flex-col items-center text-center">
        <Image
          src={errorImage}
          alt=""
          priority
          unoptimized
          className="h-auto w-full max-w-[520px]"
          sizes="(max-width: 768px) 90vw, 520px"
        />
        {content.eyebrow ? (
          <p className="mt-2 text-sm font-medium text-text-link">{content.eyebrow}</p>
        ) : null}
        <h1
          id="page-error-title"
          className="mt-2 text-2xl font-medium leading-7 text-text-primary"
        >
          {content.title}
        </h1>
        <p className="mt-2 max-w-[520px] text-base leading-6 text-text-secondary">
          {content.description}
        </p>
        <Button className="mt-6" onClick={handleAction}>
          {content.action}
        </Button>
      </div>
    </section>
  );
}
