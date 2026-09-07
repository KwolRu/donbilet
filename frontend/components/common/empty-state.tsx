"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import EmptyImage from "@/assets/images/common/empty.png";
import SearchErrorImage from "@/assets/images/common/search-error.png";

type Props = {
  title: string;
  description: string;
  type?: "empty" | "error";
  onRetry?: () => void;
};

/** Пустое состояние списка/таблицы. Вариант `error` показывает кнопку повтора. */
export function EmptyState({ title, description, type = "empty", onRetry }: Props) {
  const isError = type === "error";

  return (
    <>
      <div
        className="flex h-full min-h-[320px] w-full flex-col rounded-[24px] bg-bg-surface-base-tertiary"
        style={{ cornerShape: "squircle" } as React.CSSProperties}
      >
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
          <Image
            src={isError ? SearchErrorImage : EmptyImage}
            alt={isError ? "Ошибка" : title}
            width={308}
            height={152}
            className="mb-2"
          />
          <h3 className="text-h2 text-text-primary">{title}</h3>
          <p className="max-w-[408px] text-body-regular text-text-secondary">{description}</p>
          {isError && onRetry ? (
            <Button size="small" className="mt-2" onClick={onRetry}>
              Повторить
            </Button>
          ) : null}
        </div>
      </div>
    </>
  );
}
