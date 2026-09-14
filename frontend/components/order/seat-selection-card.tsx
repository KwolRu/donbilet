"use client";

import { SegmentedControl } from "@/components/common/segmented-control";
import { AutomaticSeatSelection } from "./automatic-seat-selection";
import { SeatMap } from "./seat-map";
import { useOrderStore, type SeatSelectionMode } from "@app/core/store/order";

const MODES: Array<{ value: SeatSelectionMode; label: string }> = [
  { value: "automatic", label: "Автоматический выбор мест" },
  { value: "list", label: "Выбор из списка" },
];

export function SeatSelectionCard() {
  const mode = useOrderStore((state) => state.mode);
  const selectedSeats = useOrderStore((state) => state.selectedSeats);
  const setMode = useOrderStore((state) => state.setMode);
  const toggleSeat = useOrderStore((state) => state.toggleSeat);

  return (
    <section className="squircle flex w-[755px] shrink-0 flex-col gap-4 rounded-db-xl bg-db-surface-default p-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-db-subsection font-medium text-db-text-primary">Выбор места</h2>

        <SegmentedControl
          value={mode}
          options={MODES}
          onChange={setMode}
          fill
          className="h-10 !w-[609px] max-w-full squircle !rounded-db-sm !border-0"
          buttonClassName="h-8 squircle !rounded-db-xs text-db-caption text-db-text-primary"
          activeButtonClassName="!bg-db-surface-base !text-db-text-primary"
        />
      </div>

      {mode === "automatic" ? (
        <AutomaticSeatSelection />
      ) : (
        <SeatMap selectedSeats={selectedSeats} onSeatToggle={toggleSeat} />
      )}
    </section>
  );
}
