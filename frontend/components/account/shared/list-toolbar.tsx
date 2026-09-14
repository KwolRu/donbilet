"use client";

import { Search, X } from "lucide-react";

import { DbSelectField } from "@/components/ui/db-form-fields";

/**
 * Тулбар раздела кабинета: вкладки слева, поиск, сортировка и чипы справа.
 *
 * Один и тот же ряд стоит над «Моими билетами» и «Избранным» — и это не
 * совпадение вёрстки, а одинаковая задача: сузить длинный список. Поэтому
 * компонент общий: разъехавшиеся копии этого ряда пришлось бы чинить дважды.
 *
 * Все состояния приходят снаружи: тулбар ничего не решает сам, он только
 * показывает выбор и сообщает о нажатии.
 */

export type ToolbarOption<T extends string> = { value: T; label: string };

export function ListToolbar<Tab extends string, Sort extends string, Filter extends string>({
  tabs,
  tab,
  onTabChange,
  query,
  onQueryChange,
  searchLabel,
  sorts,
  sort,
  onSortChange,
  filters,
  filter,
  onFilterChange,
}: {
  tabs: readonly ToolbarOption<Tab>[];
  tab: Tab;
  onTabChange: (next: Tab) => void;
  query: string;
  onQueryChange: (next: string) => void;
  /** Доступное имя поля поиска: «Поиск по билетам», «Поиск по избранному». */
  searchLabel: string;
  sorts: readonly ToolbarOption<Sort>[];
  sort: Sort;
  onSortChange: (next: Sort) => void;
  filters: readonly ToolbarOption<Filter>[];
  filter: Filter;
  onFilterChange: (next: Filter) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      {/* Вкладки. Ширина одинаковая у всех, чтобы подложка активной не прыгала
          при смене подписи. */}
      <div className="squircle flex items-center rounded-db-sm bg-db-surface-default p-1 outline outline-1 -outline-offset-1 outline-db-border-subtle">
        {tabs.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => onTabChange(item.value)}
            aria-pressed={tab === item.value}
            className={
              "squircle w-32 rounded-db-xs px-4 py-2 text-db-caption transition-colors duration-300 ease-db " +
              (tab === item.value
                ? "bg-db-surface-base text-db-text-primary"
                : "text-db-text-primary hover:bg-db-surface-muted")
            }
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        {/*
         * Поиск. Лупа темнеет, когда поле в работе, — иначе непонятно, активно
         * оно или просто нарисовано. Крестик занимает место всегда: без этого
         * поле дёргается по ширине на первом же символе.
         */}
        <label className="group squircle flex h-10 w-[324px] items-center gap-2 rounded-db-sm bg-db-surface-default px-3 outline outline-1 -outline-offset-1 outline-transparent transition-[outline-color] duration-300 ease-db focus-within:outline-db-border-hover">
          <Search
            className={
              "size-4 shrink-0 transition-colors duration-300 ease-db " +
              (query
                ? "text-db-text-primary"
                : "text-db-text-tertiary group-focus-within:text-db-text-primary")
            }
            strokeWidth={1.5}
            aria-hidden
          />
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Поиск"
            aria-label={searchLabel}
            className="w-full bg-transparent text-db-body font-medium text-db-text-primary outline-none placeholder:text-db-text-tertiary"
          />
          <button
            type="button"
            onClick={() => onQueryChange("")}
            aria-label="Очистить поиск"
            tabIndex={query ? 0 : -1}
            className={
              "flex size-5 shrink-0 items-center justify-center rounded-full text-db-text-tertiary transition-[opacity,color,transform] duration-300 ease-db hover:text-db-text-primary " +
              (query ? "opacity-100" : "pointer-events-none scale-75 opacity-0")
            }
          >
            <X className="size-4" strokeWidth={1.5} aria-hidden />
          </button>
        </label>

        {/* Сортировка — общий `DbSelectField`, тот же, что в форме пассажира. */}
        <DbSelectField
          label="Сортировка"
          hideLabel
          compact
          className="w-[200px]"
          value={sort}
          options={sorts.map((item) => ({ value: item.value, label: item.label }))}
          onChange={(next) => onSortChange(next as Sort)}
        />

        <div className="flex items-center gap-2">
          {filters.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => onFilterChange(item.value)}
              aria-pressed={filter === item.value}
              /*
               * Обводка есть у чипа всегда — меняется только её цвет. Если
               * включать её классом, на переключении видно оба состояния разом:
               * фон гаснет за 300мс, а рамка появляется мгновенно и читается
               * как чёрная рамка «залипшего» фокуса.
               */
              className={
                "rounded-full px-4 py-3 text-db-button outline outline-1 -outline-offset-1 " +
                "transition-[background-color,outline-color,transform] duration-300 ease-db active:scale-95 " +
                "focus:outline-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-db-surface-base " +
                (filter === item.value
                  ? "bg-db-surface-base text-db-text-primary outline-transparent"
                  : "bg-db-surface-default text-db-text-primary outline-db-border-subtle hover:bg-db-surface-muted")
              }
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
