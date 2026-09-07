"use client";
import { Check } from "lucide-react";
import { ButtonHTMLAttributes } from "react";

type CheckboxProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> & {
  checkedState?: boolean | "indeterminate";
  onCheckedChange?: (next: boolean) => void;
};

const baseClasses =
  "inline-flex h-4 w-4 rounded-full shrink-0 items-center justify-center border p-0 align-middle leading-none transition-colors hover:cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed";

export function Checkbox({
  checkedState = false,
  disabled,
  onCheckedChange,
  type,
  ...props
}: CheckboxProps) {
  const checkboxClasses = disabled
    ? checkedState === true || checkedState === "indeterminate"
      ? "border-transparent bg-tint text-tint-foreground"
      : "border-tertiary bg-tint text-transparent"
    : checkedState === true || checkedState === "indeterminate"
      ? "border-primary bg-primary text-white hover:bg-primary-hover"
      : "border-tertiary bg-surface text-transparent hover:bg-surface-tertiary";

  return (
    <button
      type={type ?? "button"}
      role="checkbox"
      aria-checked={checkedState === "indeterminate" ? "mixed" : checkedState}
      disabled={disabled}
      className={[baseClasses, checkboxClasses].join(" ")}
      onClick={() => {
        if (disabled || !onCheckedChange) return;
        onCheckedChange(checkedState === true ? false : true);
      }}
      style={
        {
          cornerShape: "squircle",
        } as React.CSSProperties
      }
      {...props}
    >
      {checkedState === true || checkedState === "indeterminate" ? (
        checkedState === "indeterminate" ? (
          <span className="h-0.5 w-[8px] rounded-full bg-current" />
        ) : (
          <Check className="size-3 stroke-4" />
        )
      ) : null}
    </button>
  );
}
