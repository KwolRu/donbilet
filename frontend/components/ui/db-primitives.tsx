"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import type { ReactNode } from "react";

/**
 * Мелкие примитивы ДонБилет из макета: чип, тоггл, сегментированный
 * переключатель, ссылка-кнопка раздела, заголовок секции.
 *
 * Каждый размер и цвет сверен с Figma. Менять их «на глаз» нельзя —
 * сначала правится макет, потом токен в `global.css`.
 */

// ─── Чип ──────────────────────────────────────────────────────────────────────

/**
 * Бейдж города или даты под формой поиска.
 *
 * По макету: фон #525252, padding 8/4, полное скругление, текст 12/16.
 * При наведении меняется только цвет фона. Сдвиг и масштаб убраны намеренно:
 * чипы стоят плотным рядом, и любое смещение заставляет ряд дёргаться.
 */
export function DbChip({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  const className =
    "inline-flex items-center justify-center rounded-full bg-db-surface-secondary " +
    "px-2 py-1 text-[12px] leading-4 text-db-text-inverse " +
    "transition-colors duration-300 ease-out " +
    (onClick ? "hover:bg-db-text-secondary" : "");

  return onClick ? (
    <button type="button" className={className} onClick={onClick}>
      {children}
    </button>
  ) : (
    <span className={className}>{children}</span>
  );
}

// ─── Тоггл ────────────────────────────────────────────────────────────────────

/**
 * Переключатель 28×16 из макета: включённый — жёлтый с кружком справа,
 * выключенный — серый с кружком слева.
 */
export function DbToggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={
        "flex w-7 items-center rounded-full p-0.5 transition-colors duration-300 ease-out " +
        (checked ? "bg-db-surface-base" : "bg-db-text-tertiary")
      }
    >
      {/*
       * Кружок едет трансформацией, а не сменой `justify-start`/`justify-end`:
       * выравнивание flex не анимируется и переключатель «прыгает».
       * Сдвиг 12px = ширина дорожки 28 − padding 2×2 − кружок 12.
       */}
      <span
        className={
          "size-3 rounded-full bg-db-surface-default transition-transform duration-300 ease-out " +
          (checked ? "translate-x-3" : "translate-x-0")
        }
      />
    </button>
  );
}

// ─── Сегментированный переключатель ───────────────────────────────────────────

export type SegmentOption<T extends string> = { value: T; label: string };

/**
 * Табы транспорта в форме поиска: активный — жёлтая кнопка, остальные —
 * прозрачные. Между двумя неактивными вкладками в макете стоит вертикальный
 * разделитель.
 *
 * Разделитель всегда присутствует в разметке и только меняет прозрачность.
 * Если добавлять и убирать сам элемент, ширина ряда прыгает на 9px при каждом
 * переключении, и весь блок дёргается.
 */
export function DbSegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: ReadonlyArray<SegmentOption<T>>;
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <div role="tablist" className="flex items-center gap-1">
      {options.map((option, index) => {
        const active = option.value === value;
        const prev = options[index - 1];
        // Разделитель рисуется, только если обе соседние вкладки неактивны.
        const divider = index > 0 && !active && prev && prev.value !== value;

        return (
          <div key={option.value} className="flex items-center">
            {index > 0 && (
              <span
                className={
                  "mx-1 h-[47px] w-px bg-db-border-subtle transition-opacity duration-300 ease-out " +
                  (divider ? "opacity-100" : "opacity-0")
                }
                aria-hidden
              />
            )}
            <button
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(option.value)}
              className={
                // `isolate`: без своего stacking context слой с `-z-10` уходит за фон карточки.
                "relative isolate w-[184px] squircle rounded-db-md px-5 py-4 text-[20px] leading-6 font-medium " +
                "transition-colors duration-300 ease-out " +
                (active ? "text-db-text-primary" : "text-db-text-primary hover:bg-db-surface-muted")
              }
            >
              {/*
               * Жёлтая подложка одна на весь переключатель: `layoutId` заставляет
               * motion перенести её от прежней вкладки к новой, а не погасить и
               * зажечь заново. Лежит под подписью (`-z-10` на слое, текст в
               * `relative`), поэтому текст не перекрывается.
               */}
              {active && (
                <motion.span
                  layoutId="db-segment-active"
                  // Tween, а не пружина: пружина проскакивает мимо края вкладки
                  // и подложка заметно «трясётся» в конце перехода.
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-0 -z-10 squircle rounded-db-md bg-db-button-primary-bg"
                  aria-hidden
                />
              )}
              <span className="relative">{option.label}</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ─── Ссылка-кнопка раздела ────────────────────────────────────────────────────

/** «Все направления →» справа от заголовка секции. */
export function DbSectionLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={
        "group inline-flex shrink-0 items-center justify-center gap-1 overflow-hidden squircle rounded-db-xs " +
        "bg-db-surface-default p-2 outline outline-1 -outline-offset-1 outline-db-border-subtle " +
        "transition-colors duration-300 ease-out hover:bg-db-surface-muted"
      }
    >
      <span className="px-1 text-center text-db-micro text-db-text-primary">{children}</span>
      {/* Стрелка вправо, не «вверх-вправо»: в макете видимый слой — arrow-right 12×12. */}
      <ArrowRight
        className="size-3 text-db-text-primary transition-transform duration-300 ease-out group-hover:translate-x-0.5"
        strokeWidth={1}
        aria-hidden
      />
    </Link>
  );
}

// ─── Заголовок секции ─────────────────────────────────────────────────────────

/**
 * Шапка секции: заголовок + описание слева (637px по макету), опциональная
 * ссылка справа.
 */
export function DbSectionHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex w-full items-start justify-between">
      <div className="flex w-[637px] flex-col gap-1">
        <h2 className="text-db-section font-medium text-db-text-primary">{title}</h2>
        {description && <p className="text-db-prose text-db-text-secondary">{description}</p>}
      </div>
      {action}
    </div>
  );
}
