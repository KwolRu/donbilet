"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Calendar, ChevronDown, Check, Search } from "lucide-react";

import { DbCalendar, formatDateDots } from "./db-calendar";
import { DbPopoverPanel } from "./db-popover";
import { DbField, DbFieldBody, DbFloatingLabel, dbFieldShellClass } from "./db-field";
import { usePopover } from "@app/core/hooks/use-popover";

/**
 * Поля формы ДонБилет: ввод, выбор из списка и дата.
 *
 * Общий вид и поведение подписи задаёт `db-field.tsx`: пока значения нет,
 * подпись стоит вместо него, при вводе (или открытии панели) плавно уходит
 * наверх строкой 12/16. Здесь — только то, чем поля отличаются друг от друга.
 */

/**
 * Значение в полях-кнопках.
 *
 * `overflow-clip` с запасом 4px обрезает длинную строку по ширине, но не
 * срезает нижние выносные буквы: у `truncate` клип идёт ровно по строке
 * 16/16, и «у» с «р» теряют хвосты.
 */
const VALUE_LINE =
  "block whitespace-nowrap overflow-clip [overflow-clip-margin:4px] text-[16px] leading-4";

/**
 * Строка значения поля-кнопки. Пока подпись внизу, она и есть текст строки:
 * две одинаковые надписи друг под другом выглядели бы ошибкой вёрстки.
 */
function FieldValue({
  label,
  floating,
  value,
  placeholder,
}: {
  label: string;
  floating: boolean;
  value: string | null;
  placeholder: string;
}) {
  const text = floating ? (value ?? placeholder) : label;

  return (
    <span className={`${VALUE_LINE} ${value ? "text-db-text-primary" : "text-db-text-tertiary"}`}>
      {text}
    </span>
  );
}

// ─── Текстовое поле ───────────────────────────────────────────────────────────

export function DbTextField({
  label,
  value,
  onChange,
  placeholder,
  autoFocus,
  disabled,
  invalid,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  invalid?: boolean;
}) {
  return (
    <DbField
      label={label}
      value={value}
      placeholder={placeholder}
      autoFocus={autoFocus}
      disabled={disabled}
      invalid={invalid}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

// ─── Селект ───────────────────────────────────────────────────────────────────

export type DbOption = { value: string; label: string };

/**
 * Выбор из списка.
 *
 * `searchable` включает строку поиска над списком — она нужна там, где
 * вариантов больше десятка (гражданство), и мешает там, где их четыре
 * (тип документа).
 */
export function DbSelectField({
  label,
  value,
  options,
  onChange,
  searchable = false,
  placeholder = "Выберите",
  hideLabel = false,
  compact = false,
  className,
}: {
  label: string;
  value: string | null;
  options: DbOption[];
  onChange: (next: string) => void;
  searchable?: boolean;
  placeholder?: string;
  /**
   * Не показывать подпись — она уходит в `aria-label`. Нужно там, где смысл
   * поля очевиден из самого значения: например сортировка в тулбаре списка,
   * где «Сначала новые» объясняет себя без слова «Сортировка» над ним.
   */
  hideLabel?: boolean;
  /** Высота 40 вместо 48 — размер элементов тулбара, а не формы. */
  compact?: boolean;
  /** Ширина и прочее позиционирование: по умолчанию поле занимает всю строку. */
  className?: string;
}) {
  const { open, setOpen, ref } = usePopover();
  const [query, setQuery] = useState("");

  const selected = options.find((option) => option.value === value) ?? null;

  const visible = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return options;
    return options.filter((option) => option.label.toLowerCase().includes(normalized));
  }, [options, query]);

  return (
    <div ref={ref} className={"relative " + (className ?? "w-full")}>
      <button
        type="button"
        aria-expanded={open}
        aria-label={hideLabel ? label : undefined}
        onClick={() => {
          setOpen(!open);
          setQuery("");
        }}
        /*
         * В компактном режиме обводки в покое нет: поле стоит в ряду кнопок
         * и чипов, у которых рамка `subtle`, а серая `default` от формы
         * выбивалась. Появляется она только когда список открыт.
         */
        className={
          dbFieldShellClass({ active: open }) +
          " text-left" +
          (compact ? " py-2" + (open ? "" : " outline-transparent hover:outline-db-border-subtle") : "")
        }
      >
        {hideLabel ? (
          // Без подписи значение стоит по центру оболочки: плавающей строке
          // сверху здесь взяться неоткуда, и высота поля постоянна.
          <span
            className={
              "flex min-w-0 flex-1 items-center px-1 " + (compact ? "h-6" : "h-8")
            }
          >
            <span className="truncate text-db-button text-db-text-primary">
              {selected?.label ?? placeholder}
            </span>
          </span>
        ) : (
          <DbFieldBody>
            {/* Пока выбора нет, подпись занимает место значения — как в поле ввода. */}
            <DbFloatingLabel label={label} floating={Boolean(selected) || open} />
            <FieldValue
              label={label}
              floating={Boolean(selected) || open}
              value={selected?.label ?? null}
              placeholder={placeholder}
            />
          </DbFieldBody>
        )}

        <ChevronDown
          className={
            "size-4 shrink-0 text-db-text-primary transition-transform duration-300 ease-out " +
            (open ? "rotate-180" : "")
          }
          strokeWidth={1.5}
          aria-hidden
        />
      </button>

      {/*
       * В компактном режиме панель тянется по самому длинному пункту
       * (`w-max`, но не уже поля): поле в тулбаре узкое, и подписи вроде
       * «Сначала дорогие» рвались на две строки. В форме панель по-прежнему
       * ровно по ширине поля — там она стоит в колонке и расширяться ей некуда.
       */}
      <DbPopoverPanel
        open={open}
        className={
          "squircle absolute top-full left-0 z-30 mt-2 flex flex-col rounded-db-md bg-db-surface-default shadow-none " +
          (compact ? "w-max min-w-full p-2" : "w-full p-4")
        }
      >
        {searchable && (
          <div className="mb-2 flex items-center gap-2 border-b border-db-border-subtle px-1 pt-1 pb-4">
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Поиск"
              className="min-w-0 flex-1 bg-transparent text-db-button text-db-text-primary outline-none placeholder:text-db-text-tertiary"
            />
            <Search className="size-4 shrink-0 text-db-text-secondary" strokeWidth={1.5} aria-hidden />
          </div>
        )}

        {/* `overscroll-contain`: докрутив список до края, страницу не тянем. */}
        <ul className="db-scroll flex max-h-[280px] flex-col overflow-y-auto overscroll-contain">
          {visible.map((option) => {
            const active = option.value === value;

            return (
              <li key={option.value}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={
                    "squircle flex w-full items-center gap-1 rounded-db-sm p-3 text-left " +
                    "transition-colors duration-200 ease-out hover:bg-db-surface-muted " +
                    (active ? "bg-db-surface-muted" : "")
                  }
                >
                  {/* `whitespace-nowrap`: подпись пункта не рвётся на строки —
                      панель под неё расширяется сама. */}
                  <span className="flex-1 pr-1 text-db-button whitespace-nowrap text-db-text-primary">
                    {option.label}
                  </span>
                  {active && (
                    <Check className="size-4 shrink-0 text-db-text-primary" strokeWidth={1.5} aria-hidden />
                  )}
                </button>
              </li>
            );
          })}

          {visible.length === 0 && (
            <li className="p-3 text-db-button text-db-text-secondary">Ничего не найдено</li>
          )}
        </ul>
      </DbPopoverPanel>
    </div>
  );
}

// ─── Дата ─────────────────────────────────────────────────────────────────────

export function DbDateField({
  label,
  value,
  onChange,
  min,
  max,
  placeholder = "дд.мм.гггг",
}: {
  label: string;
  value: Date | null;
  onChange: (next: Date) => void;
  min?: Date;
  max?: Date;
  placeholder?: string;
}) {
  const { open, setOpen, ref } = usePopover();

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className={dbFieldShellClass({ active: open }) + " text-left"}
      >
        <DbFieldBody>
          <DbFloatingLabel label={label} floating={Boolean(value) || open} />
          <FieldValue
            label={label}
            floating={Boolean(value) || open}
            value={value ? formatDateDots(value) : null}
            placeholder={placeholder}
          />
        </DbFieldBody>

        <Calendar className="size-4 shrink-0 text-db-text-primary" strokeWidth={1.5} aria-hidden />
      </button>

      <DbPopoverPanel
        open={open}
        origin="top right"
        className="squircle absolute top-full right-0 z-30 mt-2 rounded-db-md bg-db-surface-default p-4 shadow-[0_0_36px_rgba(0,0,0,0.12)]"
      >
        <DbCalendar
          value={value}
          min={min}
          max={max}
          onChange={(date) => {
            onChange(date);
            setOpen(false);
          }}
        />
      </DbPopoverPanel>
    </div>
  );
}

// ─── Карточка группы полей ────────────────────────────────────────────────────

/** Блок формы с заголовком: «Личные данные», «Паспорт». */
export function DbFieldGroup({
  title,
  action,
  children,
}: {
  title: string;
  /** Кнопка справа от заголовка — например удаление документа. */
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="squircle flex w-full flex-col gap-4 rounded-db-md bg-db-surface-default p-4 outline outline-1 -outline-offset-1 outline-db-border-subtle">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[16px] leading-5 font-medium text-db-text-primary">{title}</h3>
        {action}
      </div>

      {children}
    </section>
  );
}
