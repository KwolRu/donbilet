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
}

export function RadioGroup({ value, onChange, children, className }: RadioGroupProps) {
  const name = useId();
  return (
    <RadioGroupContext.Provider value={{ value, onChange, name }}>
      <div className={className} role="radiogroup">
        {children}
      </div>
    </RadioGroupContext.Provider>
  );
}

interface RadioItemProps {
  value: string;
  children: ReactNode;
  className?: string;
}

export function RadioItem({ value, children, className }: RadioItemProps) {
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
          "relative flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
          checked
            ? "border-primary bg-white"
            : "border-border-default bg-bg-surface-base-default hover:border-border-hover",
        ].join(" ")}
      >
        {checked && (
          <span className="h-2 w-2 rounded-full bg-primary" />
        )}
      </span>
      {children}
    </label>
  );
}
