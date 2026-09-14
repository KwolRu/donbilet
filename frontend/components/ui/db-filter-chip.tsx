"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Чип быстрого фильтра.
 *
 * Два состояния, и оба про одно — включён фильтр или нет:
 *   обычный   — белый, при наведении сереет;
 *   выбранный — жёлтый с тёмным крестиком: крестик появляется вместе с
 *               выбором и показывает, что чип можно снять.
 *
 * Крестика при наведении на невыбранный чип нет: снимать там нечего, а
 * появляющийся значок раздвигал бы ряд на каждом движении мыши.
 *
 * Подпись не переносится (`whitespace-nowrap`): «Только с багажом» в две
 * строки превращает чип в блок вдвое выше соседних, и ряд разъезжается.
 *
 * Компонент общий: такой же ряд стоит и над выдачей поиска, и в фильтрах
 * подборок — разъехавшиеся копии пришлось бы чинить дважды.
 */
export function DbFilterChip({
  children,
  selected = false,
  onClick,
  /** Крестик у невыбранного чипа — для действий вроде «Очистить». */
  alwaysShowClear = false,
}: {
  children: ReactNode;
  selected?: boolean;
  onClick?: () => void;
  alwaysShowClear?: boolean;
}) {
  const withClear = selected || alwaysShowClear;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={
        "flex shrink-0 items-center gap-1 rounded-full p-3 text-db-button whitespace-nowrap text-db-text-primary " +
        "transition-[background-color,transform] duration-300 ease-db active:scale-95 " +
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-db-surface-base " +
        (selected
          ? "bg-db-surface-base hover:brightness-95"
          : "bg-db-surface-default hover:bg-db-surface-muted")
      }
    >
      <span className="px-1">{children}</span>

      {/*
       * Крестик не появляется скачком: он всегда в разметке и раскрывается по
       * ширине вместе с прозрачностью. Условный рендер дёргал бы чип, а вместе
       * с ним и весь ряд — соседи сдвигались бы на 24px за кадр.
       */}
      <span
        className={
          "flex shrink-0 items-center justify-center overflow-hidden rounded-full " +
          "transition-[max-width,opacity,margin,background-color] duration-300 ease-db " +
          (withClear ? "ml-0 max-w-5 opacity-100" : "-ml-1 max-w-0 opacity-0") +
          " " +
          (selected ? "bg-db-surface-primary" : "bg-db-surface-secondary")
        }
        aria-hidden
      >
        <span className="flex size-5 items-center justify-center">
          <X className="size-2.5 text-db-text-inverse" strokeWidth={2.5} />
        </span>
      </span>
    </button>
  );
}
