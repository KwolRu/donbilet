"use client";
import { ButtonHTMLAttributes } from "react";

type ToggleSize = "sm" | "md";

type ToggleProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> & {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  size?: ToggleSize;
};

const SIZE_CLASSES: Record<ToggleSize, string> = {
  sm: "h-4 w-7",
  md: "h-5 w-9",
};

const KNOB_SIZE: Record<ToggleSize, string> = {
  sm: "size-3",
  md: "size-4",
};

const KNOB_LEFT: Record<ToggleSize, { on: string; off: string }> = {
  sm: { on: "left-[14px]", off: "left-[2px]" },
  md: { on: "left-[18px]", off: "left-[2px]" },
};

export default function Toggle({
  checked = false,
  disabled,
  type,
  onCheckedChange,
  size = "sm",
  ...props
}: ToggleProps) {
  return (
    <button
      type={type ?? "button"}
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      className={[
        "relative inline-flex shrink-0 items-center rounded-full transition-colors hover:cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed",
        SIZE_CLASSES[size],
        disabled
          ? "bg-tint"
          : checked
            ? "border-transparent bg-primary hover:bg-primary-hover"
            : "bg-surface-elevated",
      ].join(" ")}
      onClick={() => {
        if (disabled || !onCheckedChange) return;
        onCheckedChange(!checked);
      }}
      {...props}
    >
      <span
        className={[
          "absolute rounded-full transition-all",
          KNOB_SIZE[size],
          checked ? KNOB_LEFT[size].on : KNOB_LEFT[size].off,
          "bg-surface",
        ].join(" ")}
      />
    </button>
  );
}
