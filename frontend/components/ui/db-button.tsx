"use client";

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/**
 * Кнопка ДонБилет.
 *
 * Варианты и размеры взяты из макета один в один. Имя `lianer` — опечатка
 * дизайнера (вместо `liner`), сохранена намеренно: так вариант называется
 * в Figma, и по имени его можно найти в макете.
 *
 * Размеры:
 *   small — padding 16/12, radius 12, текст 16/16.32
 *   large — padding 20/16, radius 16, текст 20/24
 *
 * Варианты:
 *   primary   — жёлтый #FFC700, текст #191919
 *   secondary — тёмный #191919, текст белый
 *   lianer    — белый с обводкой #F6F6F6
 *   ghost     — белый без обводки
 *   disabled  — состояние, а не вариант: фон #F6F6F6, текст #D9D9D9
 */

type Variant = "primary" | "secondary" | "tertiary" | "lianer" | "ghost" | "plain";
type Size = "small" | "large";

const SIZE: Record<Size, string> = {
  small: "px-4 py-3 squircle rounded-db-sm text-db-button font-normal",
  large: "px-5 py-4 squircle rounded-db-md text-[20px] leading-6 font-medium",
};

const VARIANT: Record<Variant, string> = {
  primary: "bg-db-button-primary-bg text-db-text-primary hover:brightness-95",
  secondary: "bg-db-surface-primary text-db-text-inverse hover:brightness-125",
  /*
   * Tertiary — облегчённая кнопка кабинета: серая плашка #F6F6F6 без обводки.
   * Её место там, где действие второстепенное («Добавить», «Отменить»), а
   * `lianer` с рамкой перетягивал бы внимание на себя.
   */
  tertiary: "bg-db-button-tertiary-bg text-db-button-tertiary-text hover:brightness-95",
  lianer:
    "bg-db-surface-default text-db-text-primary outline outline-1 -outline-offset-1 " +
    "outline-db-border-subtle hover:bg-db-surface-muted",
  ghost: "bg-db-surface-default text-db-text-primary hover:bg-db-surface-muted",
  /*
   * Plain — только текст с иконкой: ни фона, ни обводки. Для действий в
   * заголовке страницы («Изменить», «Добавить»), где кнопка не должна
   * читаться как плашка. При наведении темнеет подпись — единственный отклик,
   * который здесь уместен.
   */
  plain: "bg-transparent text-db-text-primary hover:text-db-text-secondary",
};

/** Одинаково для всех вариантов: центровка, иконки, поведение при disabled. */
const BASE =
  "inline-flex items-center justify-center gap-1 overflow-hidden " +
  // Нажатие отзывается сжатием — щелчок по кнопке перестаёт быть «немым».
  "transition-[background-color,color,filter,transform] duration-300 ease-out active:scale-[0.97] " +
  "disabled:pointer-events-none disabled:bg-db-surface-muted disabled:text-db-button-text-disabled " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-db-surface-base";

type CommonProps = {
  variant?: Variant;
  size?: Size;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
  children: ReactNode;
  className?: string;
};

function classes({ variant = "primary", size = "small", fullWidth, className }: CommonProps) {
  return [BASE, SIZE[size], VARIANT[variant], fullWidth ? "w-full" : "", className ?? ""]
    .filter(Boolean)
    .join(" ");
}

/**
 * Внутренние отступы текста 4px по бокам — из макета: у кнопки есть внешний
 * padding и дополнительный внутренний контейнер вокруг подписи.
 */
function Content({ leftIcon, rightIcon, children }: Pick<CommonProps, "leftIcon" | "rightIcon" | "children">) {
  return (
    <>
      {leftIcon}
      <span className="flex items-center justify-center px-1 text-center">{children}</span>
      {rightIcon}
    </>
  );
}

type ButtonProps = CommonProps & Omit<ComponentProps<"button">, "children" | "className">;

export function DbButton({ variant, size, leftIcon, rightIcon, fullWidth, children, className, ...rest }: ButtonProps) {
  return (
    <button className={classes({ variant, size, fullWidth, children, className })} {...rest}>
      <Content leftIcon={leftIcon} rightIcon={rightIcon}>
        {children}
      </Content>
    </button>
  );
}

type LinkButtonProps = CommonProps & Omit<ComponentProps<typeof Link>, "children" | "className">;

/** Тот же вид, но ссылка — для «Получить предложение», «от 6 870 ₽» и подобных. */
export function DbLinkButton({ variant, size, leftIcon, rightIcon, fullWidth, children, className, ...rest }: LinkButtonProps) {
  return (
    <Link className={classes({ variant, size, fullWidth, children, className })} {...rest}>
      <Content leftIcon={leftIcon} rightIcon={rightIcon}>
        {children}
      </Content>
    </Link>
  );
}
