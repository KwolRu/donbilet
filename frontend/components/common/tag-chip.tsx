"use client";

import { X } from "lucide-react";

type Props = {
  label: string;
  removable?: boolean;
  tone?: "default" | "error";
  onRemove?: () => void;
};

export function TagChip({ label, removable = false, tone = "default", onRemove }: Props) {
  const toneClass =
    tone === "error"
      ? "bg-bg-state-base-error text-text-error"
      : "bg-bg-surface-base-primary text-text-inverse";

  return (
    <button
      type="button"
      onClick={onRemove}
      className={`h-5 px-2 inline-flex items-center gap-1.5 rounded-full text-caption-sm ${toneClass}`}
    >
      {label}
      {removable ? <X className="size-3" /> : null}
    </button>
  );
}
