"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Стрелка ленты: календаря цен и подборки жилья.
 *
 * Квадрат 40×40 с радиусом 12 и тонкой обводкой — тот же вид, что у кнопок
 * `lianer` в тулбаре. Компонент общий: две копии одной стрелки разъехались бы
 * при первой же правке.
 *
 * Уехавшая до края лента гасит свою стрелку и перестаёт её ловить: нажимать
 * её бессмысленно, а мигающая туда-сюда кнопка отвлекает.
 */
export function DbStripArrow({
  side,
  disabled,
  onClick,
  label,
  className = "",
}: {
  side: "left" | "right";
  disabled: boolean;
  onClick: () => void;
  label: string;
  /** Позиционирование задаёт лента: у календаря и карусели оно разное. */
  className?: string;
}) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={
        "squircle absolute flex size-10 items-center justify-center rounded-db-sm " +
        "bg-db-surface-default outline outline-1 -outline-offset-1 outline-db-border-subtle " +
        "transition-[opacity,background-color,transform] duration-300 ease-db " +
        "hover:bg-db-surface-muted active:scale-95 " +
        "disabled:pointer-events-none disabled:opacity-0 " +
        className
      }
    >
      <Icon className="size-4 text-db-text-primary" strokeWidth={1.5} aria-hidden />
    </button>
  );
}
