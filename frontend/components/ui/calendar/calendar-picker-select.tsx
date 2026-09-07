"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export type CalendarPickerSelectOption = {
  label: string;
  value: string;
};

type Props = {
  value: string;
  options: CalendarPickerSelectOption[];
  placeholder: string;
  widthClassName: string;
  onChange: (value: string) => void;
};

export function CalendarPickerSelect({
  value,
  options,
  placeholder,
  widthClassName,
  onChange,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return undefined;

    const handleClickOutside = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const selectedOption = options.find((option) => option.value === value);

  return (
    <div ref={rootRef} className={`relative shrink-0 ${widthClassName}`}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={[
          "flex h-10 w-full items-center justify-between rounded-[24px] border bg-surface px-3 text-left text-sm leading-4 transition-colors",
          open
            ? "border-[var(--color-text-link-hover)] text-text-primary"
            : "border-border-subtle text-text-primary hover:border-border-default",
        ].join(" ")}
        style={{ cornerShape: "squircle" } as CSSProperties}
      >
        <span className="truncate">{selectedOption?.label ?? placeholder}</span>
        <span className="relative ml-1 size-4 shrink-0 text-icon-primary">
          <ChevronDown
            className={`absolute inset-0 m-auto size-4 stroke-1.5 transition-all duration-200 ${
              open ? "scale-0 -rotate-90" : "scale-100 rotate-0"
            }`}
          />
          <ChevronUp
            className={`absolute inset-0 m-auto size-4 stroke-1.5 transition-all duration-200 ${
              open ? "scale-100 rotate-0" : "scale-0 rotate-90"
            }`}
          />
        </span>
      </button>

      {open ? (
        <div
          className="absolute left-0 right-0 top-full z-50 mt-1 w-full overflow-hidden rounded-[24px] border border-[var(--color-text-link-hover)] bg-surface p-2 shadow-[0_11px_20px_rgba(51,47,83,0.12)]"
          style={{ cornerShape: "squircle" } as CSSProperties}
        >
          <div className="custom-scrollbar max-h-[240px] space-y-1 overflow-auto pr-1">
            {options.map((option) => {
              const selected = option.value === value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={[
                    "flex w-full cursor-pointer items-center rounded-[16px] p-2 text-left text-sm leading-4 transition-colors",
                    selected
                      ? "bg-bg-surface-base-elevated text-text-link-hover"
                      : "text-text-primary hover:bg-bg-surface-base-elevated hover:text-text-link-hover",
                  ].join(" ")}
                  style={{ cornerShape: "squircle" } as CSSProperties}
                >
                  <span className="truncate">{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
