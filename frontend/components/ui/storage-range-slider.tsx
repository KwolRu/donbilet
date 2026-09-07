"use client";

import { useRef, useState } from "react";

type StoragePricing =
  | { type: "linear"; ratePerGb: number }
  | { type: "tiered"; includedGb: number; stepGb: number; pricePerStep: number };

type StorageRangeSliderProps = {
  initialValue: number;
  min: number;
  max: number;
  step: number;
  minLabel: string;
  maxLabel: string;
  ariaLabel?: string;
  pricing: StoragePricing;
  onValueCommit: (value: number) => void;
};

const rubleFormatter = new Intl.NumberFormat("ru-RU");

function getPrice(value: number, pricing: StoragePricing): number {
  if (pricing.type === "linear") {
    return Math.round(value * pricing.ratePerGb);
  }

  return Math.max(
    0,
    Math.ceil((value - pricing.includedGb) / pricing.stepGb) * pricing.pricePerStep,
  );
}

export function StorageRangeSlider({
  initialValue,
  min,
  max,
  step,
  minLabel,
  maxLabel,
  ariaLabel = "Дополнительное дисковое пространство",
  pricing,
  onValueCommit,
}: StorageRangeSliderProps) {
  const [draftValue, setDraftValue] = useState(initialValue);
  const draggingRef = useRef(false);
  const percent = Math.min(100, Math.max(0, ((draftValue - min) / (max - min)) * 100));

  const commit = (value: number) => {
    onValueCommit(value);
  };

  return (
    <div className="flex flex-col items-center gap-2 self-stretch">
      <div className="self-stretch text-center text-2xl font-bold leading-7 text-text-primary tabular-nums">
        {draftValue} ГБ + {rubleFormatter.format(getPrice(draftValue, pricing))} ₽
      </div>

      <div className="relative h-4 self-stretch">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          name="storageQuotaGb"
          defaultValue={initialValue}
          aria-label={ariaLabel}
          onPointerDown={() => {
            draggingRef.current = true;
          }}
          onPointerUp={(event) => {
            draggingRef.current = false;
            commit(Number(event.currentTarget.value));
          }}
          onPointerCancel={(event) => {
            draggingRef.current = false;
            commit(Number(event.currentTarget.value));
          }}
          onChange={(event) => {
            const value = Number(event.currentTarget.value);
            setDraftValue(value);
            if (!draggingRef.current) commit(value);
          }}
          onBlur={(event) => commit(Number(event.currentTarget.value))}
          className="peer absolute inset-0 z-10 h-4 w-full touch-manipulation cursor-pointer opacity-0"
        />
        <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-bg-surface-base-primary/20 peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2" />
        <div
          aria-hidden="true"
          className="absolute left-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-bg-surface-base-base"
          style={{ width: `${percent}%` }}
        />
        <div
          aria-hidden="true"
          className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-bg-button-primary-normal"
          style={{ left: `${percent}%` }}
        />
      </div>

      <div className="flex justify-between self-stretch text-xs font-normal leading-3 text-text-secondary">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  );
}
