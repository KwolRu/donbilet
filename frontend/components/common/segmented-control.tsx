"use client";

import type { CSSProperties } from "react";
import type { ReactNode } from "react";

export type SegmentedOption<T extends string> = {
  value: T;
  label: string;
  icon?: ReactNode;
};

type Props<T extends string> = {
  value: T;
  options: SegmentedOption<T>[];
  onChange: (value: T) => void;
  mode?: "text" | "icon";
  className?: string;
  buttonClassName?: string;
  /** Растянуть на всю доступную ширину, сегменты делят пространство поровну. */
  fill?: boolean;
};

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  mode = "text",
  className = "",
  buttonClassName = "",
  fill = false,
}: Props<T>) {
  return (
    <div
      className={`${fill ? "flex w-full min-w-0" : "inline-flex"} h-10 box-border items-center rounded-full border border-border-subtle p-1 ${className}`}
      style={{ cornerShape: "squircle" } as CSSProperties}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => {
            if (value !== option.value) onChange(option.value);
          }}
          className={`inline-flex h-8 items-center justify-center rounded-full transition-colors ${
            mode === "icon" ? "w-8 px-0" : fill ? "min-w-0 flex-1 px-2 text-body-regular" : "px-4 text-body-regular"
          } ${buttonClassName} ${
            value === option.value
              ? "bg-bg-surface-base-elevated text-primary-hover"
              : "text-text-secondary hover:text-text-primary"
          }`}
          style={{ cornerShape: "squircle" } as CSSProperties}
        >
          {mode === "icon" ? option.icon : option.label}
        </button>
      ))}
    </div>
  );
}
