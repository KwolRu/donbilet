"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import EmptySearchImage from "@/assets/images/common/empty.png";
import SearchErrorImage from "@/assets/images/common/search-error.png";

type Props = {
  query: string;
  type: "empty" | "error";
  onRetry?: () => void;
};

export function SearchResultsState({ query, type, onRetry }: Props) {
  return (
    <>
      <p className="text-text-primary text-h3 -mb-2">
        {type === "error" ? "Ошибка поиска" : `По запросу «${query}»`}
      </p>
      <div
        className="w-full rounded-[24px] bg-bg-surface-base-tertiary h-full flex flex-col"
        style={{ cornerShape: "squircle" } as React.CSSProperties}
      >
        <div className="flex-1 flex items-center justify-center">
          <div className="max-w-[408px] flex flex-col items-center text-center gap-2">
            <Image
              src={type === "error" ? SearchErrorImage : EmptySearchImage}
              alt={type === "error" ? "Ошибка поиска" : "Ничего не найдено"}
              width={308}
              height={152}
            />
            <h3 className="text-h2 text-text-primary">
              {type === "error" ? "Не удалось выполнить поиск" : "Здесь пока пусто"}
            </h3>
            {type === "error" ? (
              <>
                <p className="text-body-regular text-text-secondary">Что-то пошло не так.</p>
                <p className="text-body-regular text-text-secondary">
                  Попробуйте выполнить поиск еще раз.
                </p>
                <Button size="small" className="mt-1" onClick={onRetry}>
                  Повторить
                </Button>
              </>
            ) : (
              <p className="text-body-regular text-text-secondary">
                Попробуйте изменить запрос или проверить правильность написания.
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
