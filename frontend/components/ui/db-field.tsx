"use client";

import { useState, type ComponentProps, type ReactNode } from "react";

/**
 * Поле ввода ДонБилет с плавающей подписью.
 *
 * По макету: padding 12/8, radius 12 (токен `sm`), обводка #d9d9d9, высота
 * содержимого 32. Пока поле пустое и не в фокусе, подпись стоит вместо
 * значения (роль плейсхолдера); как только пользователь начал ввод — она
 * плавно поднимается наверх строкой 12px, а значение занимает нижнюю строку.
 *
 * Почему высота не прыгает: 16 (подпись 12/16) + 16 (значение 16/16) = ровно
 * те же 32px, что занимает одно значение по центру. Анимируется только
 * высота подписи, поэтому поле не дёргает соседей в форме.
 *
 * Подпись не обрезается: внешний слой с `overflow-hidden` имеет высоту 16px,
 * а текст внутри — line-height 16 при кегле 12, так что выносные элементы
 * («у», «р», «ф») целиком помещаются в строку.
 */

const SHELL_BASE =
  "squircle flex w-full items-center gap-1 rounded-db-sm px-3 py-2 " +
  "outline outline-1 -outline-offset-1 " +
  "transition-[background-color,outline-color] duration-300 ease-out";

/** Классы оболочки поля — общие для ввода, селекта и даты. */
export function dbFieldShellClass({
  invalid,
  active,
  disabled,
}: {
  /** Ошибка валидации: красная рамка и подложка. */
  invalid?: boolean;
  /** Поле в фокусе или его выпадающая панель открыта. */
  active?: boolean;
  disabled?: boolean;
} = {}) {
  if (invalid) return `${SHELL_BASE} bg-db-field-error outline-db-border-error`;

  const state = active
    ? "bg-db-field-active outline-db-border-hover"
    : "bg-db-surface-default outline-db-border-default hover:outline-db-text-tertiary";

  return `${SHELL_BASE} ${state}${disabled ? " pointer-events-none opacity-60" : ""}`;
}

/**
 * Плавающая подпись.
 *
 * `floating` = есть значение или поле активно. Свёрнутое состояние — нулевая
 * высота и прозрачность: подпись не участвует в раскладке, значение стоит по
 * центру поля.
 */
export function DbFloatingLabel({ label, floating }: { label: string; floating: boolean }) {
  return (
    <span
      aria-hidden
      className={
        "block overflow-hidden text-db-text-secondary " +
        "transition-[height,opacity] duration-200 ease-out " +
        (floating ? "h-4 opacity-100" : "h-0 opacity-0")
      }
    >
      <span className="block text-[12px] leading-4">{label}</span>
    </span>
  );
}

/** Колонка «подпись + значение» внутри оболочки. */
export function DbFieldBody({ children }: { children: ReactNode }) {
  return <span className="flex h-8 min-w-0 flex-1 flex-col justify-center px-1">{children}</span>;
}

type DbFieldProps = {
  label: string;
  value: string;
  invalid?: boolean;
  /** Подсказка формата, видна только когда подпись уже поднялась наверх. */
  placeholder?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  className?: string;
} & Omit<ComponentProps<"input">, "value" | "className" | "placeholder">;

export function DbField({
  label,
  value,
  invalid,
  placeholder,
  leftIcon,
  rightIcon,
  className,
  onFocus,
  onBlur,
  disabled,
  ...rest
}: DbFieldProps) {
  const [focused, setFocused] = useState(false);
  const floating = focused || value.length > 0;

  return (
    <label
      className={
        dbFieldShellClass({ invalid, active: focused, disabled }) +
        " cursor-text" +
        (className ? ` ${className}` : "")
      }
    >
      {leftIcon}

      <DbFieldBody>
        <DbFloatingLabel label={label} floating={floating} />
        <input
          value={value}
          disabled={disabled}
          aria-label={label}
          // Пока подпись внизу, она и есть плейсхолдер: две одинаковые строки
          // друг под другом выглядели бы ошибкой вёрстки.
          placeholder={floating ? placeholder : label}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          className={
            "w-full bg-transparent text-[16px] leading-4 text-db-text-primary outline-none " +
            "placeholder:text-db-text-tertiary"
          }
          {...rest}
        />
      </DbFieldBody>

      {rightIcon}
    </label>
  );
}
