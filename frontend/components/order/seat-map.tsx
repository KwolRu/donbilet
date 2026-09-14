"use client";

import { Info } from "lucide-react";

import { MOCK_ORDER, type OrderSeatCell } from "@app/core/mocks/order";

type SeatMapProps = {
  selectedSeats: number[];
  onSeatToggle: (seat: number) => void;
  disabled?: boolean;
};

function Seat({
  value,
  selected,
  disabled,
  onToggle,
}: {
  value: OrderSeatCell;
  selected: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  if (value === null) return <span aria-hidden />;

  if (value === "unavailable") {
    return (
      <span
        aria-label="Место недоступно"
        className="order-seat-unavailable squircle block size-full rounded-db-xs"
      />
    );
  }

  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={`Место ${value}${selected ? ", выбрано" : ""}`}
      disabled={disabled}
      onClick={onToggle}
      className={
        "squircle flex size-full items-center justify-center rounded-db-sm text-[18px] leading-6 font-medium " +
        "transition-[background-color,filter,transform] duration-300 ease-db active:scale-95 " +
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-db-surface-base " +
        (selected
          ? "bg-db-surface-base text-db-text-primary hover:brightness-95"
          : "bg-db-surface-muted text-db-text-primary hover:bg-db-border-default")
      }
    >
      {value}
    </button>
  );
}

export function SeatMap({ selectedSeats, onSeatToggle, disabled = false }: SeatMapProps) {
  return (
    <div className="flex flex-col gap-4">
      <div
        data-order-seat-map
        className="squircle relative aspect-[83/33] w-[664px] max-w-full overflow-hidden rounded-db-2xl bg-db-surface-default outline outline-2 -outline-offset-2 outline-db-border-subtle"
        aria-label="Схема мест в автобусе"
      >
        {/* Панель в носовой части является частью общего корпуса, поэтому на
         * стыке нет щели и отдельной рамки-пустышки. */}
        <span
          className="squircle absolute top-2 right-2 bottom-2 left-[604px] rounded-r-db-2xl bg-db-surface-muted"
          aria-hidden
        />
        <span className="absolute top-0.5 left-[594px] z-10 h-64 w-2.5 bg-db-surface-default" aria-hidden />

        {/* Салон: рабочая область 568×232px, padding 16px и шаг мест 8px. */}
        <div className="absolute top-4 left-4 z-20 grid h-[232px] w-[568px] grid-cols-12 grid-rows-5 gap-2">
          {MOCK_ORDER.seatColumns.flatMap((column, columnIndex) =>
            column.map((seat, rowIndex) => (
              <span
                key={`${columnIndex}-${rowIndex}`}
                className="block min-h-0 min-w-0"
                style={{ gridColumn: columnIndex + 1, gridRow: rowIndex + 1 }}
              >
                <Seat
                  value={seat}
                  selected={typeof seat === "number" && selectedSeats.includes(seat)}
                  disabled={disabled}
                  onToggle={() => typeof seat === "number" && onSeatToggle(seat)}
                />
              </span>
            )),
          )}
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
