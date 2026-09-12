"use client";

import { useMemo } from "react";

import { MOCK_CITIES, type MockCity } from "@app/core/mocks/landing";
import { usePopover } from "@app/core/hooks/use-popover";
import { DbPopoverPanel } from "@/components/ui/db-popover";

/**
 * Поле выбора города («Откуда» / «Куда») с выпадающим списком.
 *
 * Данные — из `core/mocks/landing`. Когда появится рабочий API, список
 * приходит из `fetchDepartureCities` / `fetchArrivalCities` — форма элемента
 * та же, меняется только источник.
 *
 * Панель по макету: 240px, padding 12, radius 16, тень 0 0 36 rgba(0,0,0,.12);
 * строка — padding 8, radius 8, название 18/24 medium и регион 14/16 серым.
 *
 * Поля ввода в панели нет — в макете это просто список. Печать в самом поле
 * «Откуда»/«Куда» появится вместе с подсказками от API (Ф4): сейчас список
 * короткий и фильтровать нечего.
 */
export function CityField({
  label,
  value,
  onChange,
  excludeId,
}: {
  label: string;
  value: MockCity | null;
  onChange: (city: MockCity) => void;
  /** Город, выбранный в соседнем поле: предлагать его же бессмысленно. */
  excludeId?: number | null;
}) {
  const { open, setOpen, ref } = usePopover();

  // Город, выбранный в соседнем поле, из списка убираем: маршрут «из А в А» не бывает.
  const options = useMemo(
    () => MOCK_CITIES.filter((city) => city.id !== excludeId),
    [excludeId],
  );

  return (
    <div ref={ref} className="relative flex flex-1 flex-col">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className={
          "flex flex-col items-start gap-0.5 squircle rounded-db-sm px-3 py-1 text-left " +
          "transition-colors duration-300 ease-out hover:bg-db-surface-muted " +
          (open ? "bg-db-surface-muted" : "")
        }
      >
        <span className="text-db-micro text-db-text-secondary">{label}</span>
        <span className="text-db-field font-semibold text-db-text-primary">
          {value ? value.name : "Выберите город"}
        </span>
      </button>

      <DbPopoverPanel
        open={open}
        className="absolute top-full left-0 z-20 mt-3 w-60 squircle rounded-db-md bg-db-surface-default p-3 shadow-[0_0_36px_rgba(0,0,0,0.12)]"
      >
        {/* `db-scroll`: тонкая полоса-указатель справа, как в макете. */}
        {/* `overscroll-contain`: докрутив список до края, страницу не тянем. */}
        <ul className="db-scroll flex max-h-[296px] flex-col gap-1 overflow-y-auto overscroll-contain">
          {options.map((city) => (
            <li key={city.id}>
              <button
                type="button"
                onClick={() => {
                  onChange(city);
                  setOpen(false);
                }}
                className={
                  "flex w-full flex-col items-start gap-1 squircle rounded-db-xs p-2 text-left " +
                  "transition-colors duration-300 ease-out hover:bg-db-surface-muted " +
                  (value?.id === city.id ? "bg-db-surface-muted" : "")
                }
              >
                <span className="text-[18px] leading-6 font-medium text-db-text-primary">
                  {city.name}
                </span>
                <span className="text-[14px] leading-4 text-db-text-secondary">{city.region}</span>
              </button>
            </li>
          ))}
        </ul>
      </DbPopoverPanel>
    </div>
  );
}
