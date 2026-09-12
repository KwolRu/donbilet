"use client";

import { useRef, type ClipboardEvent, type KeyboardEvent } from "react";

/**
 * Ввод кода подтверждения: четыре ячейки из макета.
 *
 * Ячейка: padding 12/8, radius 12, обводка #d9d9d9. Активная — жёлтая обводка
 * и светлая подложка, ошибка — красная обводка, розовая подложка и красная
 * цифра. Пустая ячейка показывает «•», как в макете.
 *
 * Поведение: цифра переводит фокус вперёд, Backspace на пустой — назад,
 * стрелки ходят по ячейкам, вставка кода из буфера раскладывается по ячейкам.
 * Всё это ожидаемо для кода из SMS и письма — без этого поле раздражает.
 */

const LENGTH = 4;

export function DbOtpInput({
  value,
  onChange,
  invalid,
  autoFocus,
}: {
  /** Строка из цифр длиной не больше четырёх. */
  value: string;
  onChange: (next: string) => void;
  invalid?: boolean;
  autoFocus?: boolean;
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  function focusAt(index: number) {
    refs.current[Math.max(0, Math.min(LENGTH - 1, index))]?.focus();
  }

  function setCharAt(index: number, char: string) {
    const chars = value.padEnd(LENGTH, " ").split("");
    chars[index] = char || " ";
    onChange(chars.join("").trimEnd());
  }

  function handleInput(index: number, raw: string) {
    const digit = raw.replace(/\D/g, "").slice(-1);
    if (!digit) return;
    setCharAt(index, digit);
    focusAt(index + 1);
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace") {
      event.preventDefault();
      if (value[index]) {
        setCharAt(index, "");
      } else {
        setCharAt(index - 1, "");
        focusAt(index - 1);
      }
      return;
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusAt(index - 1);
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      focusAt(index + 1);
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    const digits = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, LENGTH);
    if (!digits) return;
    event.preventDefault();
    onChange(digits);
    focusAt(digits.length);
  }

  return (
    <div className="flex w-full items-start gap-4">
      {Array.from({ length: LENGTH }, (_, index) => {
        const char = value[index] ?? "";

        return (
          <div
            key={index}
            className={
              "squircle flex flex-1 items-center justify-center rounded-db-sm px-3 py-2 " +
              "outline outline-1 -outline-offset-1 " +
              "transition-[background-color,outline-color] duration-300 ease-out " +
              (invalid
                ? "bg-db-field-error outline-db-border-error"
                : "bg-db-surface-default outline-db-border-default focus-within:bg-db-field-active focus-within:outline-db-border-hover")
            }
          >
            <div className="flex h-8 flex-1 items-center justify-center px-1">
              <input
                ref={(node) => {
                  refs.current[index] = node;
                }}
                value={char}
                onChange={(event) => handleInput(index, event.target.value)}
                onKeyDown={(event) => handleKeyDown(index, event)}
                onPaste={handlePaste}
                onFocus={(event) => event.target.select()}
                inputMode="numeric"
                autoComplete="one-time-code"
                aria-label={`Цифра ${index + 1} из ${LENGTH}`}
                autoFocus={autoFocus && index === 0}
                maxLength={1}
                placeholder="•"
                className={
                  "w-full bg-transparent text-center text-[16px] leading-4 outline-none " +
                  "placeholder:font-normal placeholder:text-db-text-tertiary " +
                  (invalid ? "font-bold text-db-text-error" : "font-bold text-db-text-primary")
                }
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
