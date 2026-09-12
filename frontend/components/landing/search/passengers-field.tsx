"use client";

import { Minus, Plus } from "lucide-react";

import { selectRussianPlural } from "@app/core/utils/russian-plural";
import { usePopover } from "@app/core/hooks/use-popover";
import { DbPopoverPanel } from "@/components/ui/db-popover";

/**
 * Поле «Кто едет»: счётчики пассажиров и класс обслуживания.
 *
 * Панель по макету: 339px, padding 24, radius 20. Кнопка «минус» серая
 * (#F6F6F6), «плюс» жёлтая — так в макете, независимо от доступности.
 */

export type ServiceClass = "economy" | "business" | "first";

export type Passengers = {
  adults: number;
  children: number;
  infants: number;
  serviceClass: ServiceClass;
};

export const DEFAULT_PASSENGERS: Passengers = {
  adults: 1,
  children: 0,
  infants: 0,
  serviceClass: "economy",
};

const GROUPS: Array<{ key: keyof Omit<Passengers, "serviceClass">; title: string; hint: string; min: number }> = [
  { key: "adults", title: "Взрослые", hint: "12 лет и старше", min: 1 },
  { key: "children", title: "Дети", hint: "От 2 до 11 лет", min: 0 },
  { key: "infants", title: "Младенцы", hint: "До 2 лет, без места", min: 0 },
];

const CLASSES: Array<{ value: ServiceClass; label: string }> = [
  { value: "economy", label: "Эконом" },
  { value: "business", label: "Бизнес" },
  { value: "first", label: "Первый класс" },
];

/** Максимум мест в одном заказе. Ограничение перевозчиков, не UI. */
const MAX_SEATS = 10;

export function summarizePassengers({ adults, children, infants, serviceClass }: Passengers) {
  const total = adults + children + infants;
  const label = selectRussianPlural(total, {
    one: "пассажир",
    few: "пассажира",
    many: "пассажиров",
  });
  const className = CLASSES.find((item) => item.value === serviceClass)?.label ?? "";
  return { total, title: `${total} ${label}`, subtitle: className };
}

export function PassengersField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Passengers;
  onChange: (next: Passengers) => void;
}) {
  const { open, setOpen, ref } = usePopover();
  const summary = summarizePassengers(value);
  // Младенцы едут на руках — место не занимают.
  const seats = value.adults + value.children;

  function setCount(key: keyof Omit<Passengers, "serviceClass">, next: number) {
    onChange({ ...value, [key]: next });
  }

  return (
    <div ref={ref} className="relative flex w-[176px] flex-col">
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
        <span className="text-db-field font-semibold text-db-text-primary">{summary.title}</span>
      </button>

      <DbPopoverPanel
        open={open}
        origin="top right"
        className="absolute top-full right-0 z-20 mt-3 flex w-[339px] flex-col gap-6 squircle rounded-db-lg bg-db-surface-default p-6 shadow-[0_4px_29.5px_rgba(36,35,32,0.20)]"
      >
        <div className="flex flex-col gap-3">
            <h3 className="text-[20px] leading-6 font-bold text-db-text-primary">Пассажиры</h3>

            {GROUPS.map((group) => {
              const count = value[group.key];
              const canAdd = group.key === "infants" ? count < value.adults : seats < MAX_SEATS;

              return (
                <div key={group.key} className="flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="text-db-field text-db-text-primary">{group.title}</span>
                    {/* nowrap: в макете подсказка в одну строку, места ровно хватает. */}
                    <span className="text-db-body font-light whitespace-nowrap text-db-text-secondary">
                      {group.hint}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      aria-label={`Убрать: ${group.title}`}
                      disabled={count <= group.min}
                      onClick={() => setCount(group.key, count - 1)}
                      className="flex items-center justify-center squircle rounded-db-sm bg-db-surface-muted p-3 transition-[opacity,transform,filter] duration-300 ease-out hover:brightness-95 disabled:opacity-40"
                    >
                      <Minus className="size-4 text-db-text-primary" strokeWidth={2} aria-hidden />
                    </button>

                    <span className="w-9 text-center text-[20px] leading-6 font-bold text-db-text-primary">
                      {count}
                    </span>

                    <button
                      type="button"
                      aria-label={`Добавить: ${group.title}`}
                      disabled={!canAdd}
                      onClick={() => setCount(group.key, count + 1)}
                      className="flex items-center justify-center squircle rounded-db-sm bg-db-button-primary-bg p-3 transition-[opacity,transform,filter] duration-300 ease-out hover:brightness-95 disabled:opacity-40"
                    >
                      <Plus className="size-4 text-db-text-primary" strokeWidth={2} aria-hidden />
                    </button>
                  </div>
                </div>
              );
            })}
        </div>

        <div className="flex flex-col gap-3" role="radiogroup" aria-label="Класс обслуживания">
          <h3 className="text-[20px] leading-6 font-bold text-db-text-primary">
            Класс обслуживания
          </h3>

          {CLASSES.map((item) => {
            const active = item.value === value.serviceClass;

            return (
              <button
                key={item.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onChange({ ...value, serviceClass: item.value })}
                className="group flex items-center justify-between"
              >
                <span className="text-db-field text-db-text-primary transition-colors duration-300 ease-out group-hover:text-db-text-secondary">
                  {item.label}
                </span>

                {/*
                 * Точка внутри всегда в разметке: при выборе она вырастает из
                 * нуля. Условный рендер такого перехода не даёт — элемент
                 * появляется мгновенно.
                 *
                 * Обводка тоже всегда в разметке и меняет только цвет. Если
                 * добавлять сам класс `outline`, он включается мгновенно, а фон
                 * гаснет за 300мс — и у прежде выбранного пункта на миг видны
                 * сразу и жёлтая заливка, и рамка.
                 */}
                <span
                  className={
                    "flex size-6 items-center justify-center rounded-full " +
                    "outline outline-[0.8px] -outline-offset-[0.8px] " +
                    "transition-[background-color,outline-color] duration-300 ease-out " +
                    (active
                      ? "bg-db-surface-base outline-transparent"
                      : "bg-transparent outline-db-text-tertiary")
                  }
                  aria-hidden
                >
                  <span
                    className={
                      "size-2 rounded-full bg-db-surface-default transition-transform duration-300 ease-out " +
                      (active ? "scale-100" : "scale-0")
                    }
                  />
                </span>
              </button>
            );
          })}
        </div>
      </DbPopoverPanel>
    </div>
  );
}
