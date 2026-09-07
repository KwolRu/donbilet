"use client";

import { Settings } from "lucide-react";
import type { CSSProperties } from "react";

type Props = {
  from: number;
  to: number;
  onOpenSettings: () => void;
};

export function TableRangeControl({ from, to, onOpenSettings }: Props) {
  return (
    <div
      className="h-10 inline-flex items-center rounded-full border border-border-subtle bg-bg-surface-base-default"
      style={{ cornerShape: "squircle" } as CSSProperties}
    >
      <button type="button" className="h-full px-4 text-button-sm text-text-primary">
        {`${from} — ${to}`}
      </button>
      <span className="h-full w-px bg-border-subtle" />
      <button
        type="button"
        className="h-full w-10 inline-flex items-center justify-center text-icon-button-linear-normal hover:text-text-button-linear-hover transition-colors"
        onClick={onOpenSettings}
        aria-label="Открыть настройки таблицы"
      >
        <Settings className="size-4 stroke-[2]" />
      </button>
    </div>
  );
}
