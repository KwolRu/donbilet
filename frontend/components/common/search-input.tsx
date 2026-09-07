"use client";

import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { Search, X } from "lucide-react";

type Props = {
  value: string;
  placeholder?: string;
  ariaLabel?: string;
  name?: string;
  onChange: (value: string) => void;
  className?: string;
};

export const SearchInput = forwardRef<HTMLInputElement, Props>(function SearchInput(
  { value, placeholder = "Поиск…", ariaLabel, name = "search", onChange, className = "" }: Props,
  ref,
) {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useImperativeHandle(ref, () => inputRef.current!, []);

  const handleClear = () => {
    onChange("");
    inputRef.current?.focus();
  };

  return (
    <div
      className={`flex h-10 items-center gap-2 rounded-[24px] border p-3 transition-colors ${
        focused ? "border-primary-hover!" : "border-border-subtle"
      } ${className}`}
      style={{ cornerShape: "squircle" } as React.CSSProperties}
    >
      <Search size={16} className="text-text-primary" aria-hidden="true" />
      <input
        ref={inputRef}
        type="text"
        name={name}
        aria-label={ariaLabel ?? placeholder}
        autoComplete="off"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="text-input-lg placeholder:text-tertiary w-full flex-1 outline-none text-text-primary"
      />
      {value.trim().length > 0 ? (
        <button
          type="button"
          onClick={handleClear}
          className="flex h-5 w-5 items-center justify-center rounded-full text-icon-secondary transition-colors hover:bg-bg-surface-base-tertiary hover:text-icon-primary"
          aria-label="Очистить поиск"
        >
          <X size={14} aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
});
