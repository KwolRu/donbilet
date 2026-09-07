"use client";

import { ChevronRight } from "lucide-react";

/** Человекочитаемый размер: 70.4 ГБ, 1.0 ТБ, 512 МБ. */
export function formatStorageSize(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 Б";
  const units = ["Б", "КБ", "МБ", "ГБ", "ТБ"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const rounded = value >= 100 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded} ${units[unit]}`;
}

type Props = {
  usedBytes: number;
  quotaBytes: number;
  /** Клик по стрелке — переход в раздел «Дисковое пространство» (когда появится). */
  onOpen?: () => void;
  className?: string;
};

/**
 * Презентационный индикатор занятого дискового пространства.
 * Данные приходят пропсами — источник (стор) подключается снаружи.
 */
export function StorageUsageBar({ usedBytes, quotaBytes, onOpen, className = "" }: Props) {
  const ratio = quotaBytes > 0 ? Math.min(usedBytes / quotaBytes, 1) : 0;
  const pct = Math.round(ratio * 100);
  const nearLimit = ratio >= 0.9;

  return (
    <div
      className={`flex w-56 items-center gap-1 overflow-hidden rounded-xl border border-border-subtle bg-bg-surface-base-default p-2 ${className}`}
    >
      <div className="flex flex-1 flex-col items-start gap-1">
        <div className="text-caption-lg text-text-primary">
          Занято {formatStorageSize(usedBytes)} из {formatStorageSize(quotaBytes)}
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-bg-surface-base-tertiary">
          <div
            className={`h-full rounded-full ${nearLimit ? "bg-error" : "bg-bg-surface-base-success"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      {onOpen ? (
        <button
          type="button"
          onClick={onOpen}
          className="flex h-4 w-4 shrink-0 items-center justify-center text-icon-primary"
          aria-label="Дисковое пространство"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}
