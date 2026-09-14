"use client";

import { Info, Minus, Plus } from "lucide-react";

import {
  ORDER_MAX_PASSENGERS,
  ORDER_MIN_PASSENGERS,
  useOrderStore,
} from "@app/core/store/order";

export function AutomaticSeatSelection() {
  const passengerCount = useOrderStore((state) => state.passengerCount);
  const setPassengerCount = useOrderStore((state) => state.setPassengerCount);

  return (
    <div data-order-automatic-selection className="flex flex-col gap-4">
      <div className="squircle flex flex-col gap-2 rounded-db-sm bg-db-surface-default p-3 outline outline-1 -outline-offset-1 outline-db-border-subtle">
        <h3 className="text-db-body leading-5 font-medium text-db-text-primary">
          Выберите количество пассажиров
        </h3>

        <p className="text-db-caption leading-5 text-db-text-secondary">
          Места будут назначены автоматически, постараемся подобрать места рядом
        </p>

        <div className="squircle flex h-10 w-48 items-center rounded-db-sm bg-db-surface-default px-3 py-2 outline outline-1 -outline-offset-1 outline-db-border-default">
          <button
            type="button"
            aria-label="Уменьшить количество пассажиров"
            disabled={passengerCount <= ORDER_MIN_PASSENGERS}
            onClick={() => setPassengerCount(passengerCount - 1)}
            className="flex size-6 shrink-0 items-center justify-center transition-[opacity,transform] duration-300 ease-db active:scale-90 disabled:opacity-30"
          >
            <Minus className="size-4 text-db-text-primary" strokeWidth={1.5} aria-hidden />
          </button>

          <output
            aria-label="Количество пассажиров"
            className="flex-1 px-1 text-center text-db-button text-db-text-primary"
          >
            {passengerCount}
          </output>

          <button
            type="button"
            aria-label="Увеличить количество пассажиров"
            disabled={passengerCount >= ORDER_MAX_PASSENGERS}
            onClick={() => setPassengerCount(passengerCount + 1)}
            className="flex size-4 shrink-0 items-center justify-center transition-[opacity,transform] duration-300 ease-db active:scale-90 disabled:opacity-30"
          >
            <Plus className="size-4 text-db-text-primary" strokeWidth={1.5} aria-hidden />
          </button>
        </div>
      </div>

      <div className="squircle inline-flex w-fit items-center gap-1 rounded-db-full bg-db-surface-muted px-2 py-1">
        <Info className="size-3 shrink-0 text-db-text-secondary" strokeWidth={1.5} aria-hidden />
        <span className="text-db-chip text-db-text-secondary">
          Расположение мест может поменяться в случае замены перевозчиком автобуса на рейс.
        </span>
      </div>
    </div>
  );
}
