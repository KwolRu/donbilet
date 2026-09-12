"use client";

import type { ReactNode } from "react";

/**
 * Галочка рисуется своим путём, а не иконкой из набора: у lucide `Check`
 * штрих не заполняет viewBox симметрично, и внутри маленького квадрата
 * она заметно съезжает вправо-вниз.
 */
function CheckMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden className={className}>
      <path
        d="M3 8.5 6.5 12 13 4.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Чекбокс ДонБилет.
 *
 * По макету: квадрат 24×24, радиус 8 (токен `xs`), обводка #D9D9D9. Отмеченный
 * заливается фирменным жёлтым, галочка тёмная — белая на #FFC700 не читается.
 *
 * Галочка всегда в разметке и растёт из нуля: условный рендер даёт рывок, а
 * ширина элемента при этом не меняется — соседний текст не дёргается.
 */
export function DbCheckbox({
  checked,
  onChange,
  children,
  disabled = false,
  id,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  /** Подпись справа. Кликается вместе с квадратом. */
  children?: ReactNode;
  disabled?: boolean;
  id?: string;
}) {
  return (
    <label
      htmlFor={id}
      /*
       * `items-start`: у многострочной подписи квадрат должен стоять у первой
       * строки, а не посередине абзаца. Однострочную подпись центрирует сам
       * текстовый блок — у него та же высота 24, что у квадрата.
       */
      className={
        // `flex`, а не `inline-flex`: подпись должна занимать всю доступную
        // ширину и переноситься по ней, а не по своей минимальной.
        "group flex items-start gap-2 " +
        (disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer")
      }
    >
      <button
        id={id}
        type="button"
        role="checkbox"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={
          "squircle flex size-6 shrink-0 items-center justify-center rounded-db-xs " +
          "outline outline-1 -outline-offset-1 " +
          "transition-[background-color,outline-color,transform] duration-300 ease-out " +
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-db-surface-base " +
          (disabled ? "" : "active:scale-90 ") +
          (checked
            ? "bg-db-surface-base outline-transparent"
            : "bg-db-surface-default outline-db-border-default group-hover:outline-db-text-tertiary")
        }
      >
        <CheckMark
          className={
            "size-4 text-db-text-primary transition-transform duration-300 ease-out " +
            (checked ? "scale-100" : "scale-0")
          }
        />
      </button>

      {children && (
        /*
         * Два слоя: внешний центрирует подпись по высоте квадрата, внутренний
         * оставляет её обычным текстом. Без внутреннего слоя текст и ссылка
         * внутри подписи становятся flex-элементами и встают разными строками.
         */
        <span className="flex min-h-6 min-w-0 flex-1 items-center">
          <span className="text-db-button text-db-text-primary select-none">{children}</span>
        </span>
      )}
    </label>
  );
}
