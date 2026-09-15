"use client";

import { createContext, useContext, useId, type ReactNode } from "react";

interface RadioGroupContextValue {
  value: string;
  onChange: (value: string) => void;
  name: string;
}

const RadioGroupContext = createContext<RadioGroupContextValue | null>(null);

interface RadioGroupProps {
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
}

export function RadioGroup({ value, onChange, children, className, ariaLabel }: RadioGroupProps) {
  const name = useId();
  return (
    <RadioGroupContext.Provider value={{ value, onChange, name }}>
      <div className={className} role="radiogroup" aria-label={ariaLabel}>
        {children}
      </div>
    </RadioGroupContext.Provider>
  );
}

interface RadioItemProps {
  value: string;
  children: ReactNode;
  className?: string;
  size?: "small" | "large";
  filled?: boolean;
}

export function RadioItem({ value, children, className, size = "small", filled = false }: RadioItemProps) {
  const ctx = useContext(RadioGroupContext);
  if (!ctx) throw new Error("RadioItem must be used inside RadioGroup");

  const checked = ctx.value === value;

  return (
    <label
      className={[
        "inline-flex cursor-pointer items-center gap-2",
        className,
      ].join(" ")}
    >
      <input
        type="radio"
        name={ctx.name}
        value={value}
        checked={checked}
        onChange={() => ctx.onChange(value)}
        className="sr-only"
      />
      <span
        className={[
          "pointer-events-none relative flex shrink-0 items-center justify-center rounded-full transition-colors",
          size === "large" ? "size-6 border" : "size-4 border-2",
          checked
            ? filled
              ? "border-db-surface-base bg-db-surface-base"
              : "border-primary bg-white"
            : "border-border-default bg-bg-surface-base-default hover:border-border-hover",
        ].join(" ")}
      >
        {checked && (
          <span
            className={
              (size === "large" ? "size-3" : "size-2") +
              " rounded-full " +
              (filled ? "bg-db-surface-default" : "bg-primary")
            }
          />
        )}
      </span>
      {children}
    </label>
  );
}
