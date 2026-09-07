"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { extract } from "fuzzball";
import cities from "@app/core/data/russian-cities.json";
import { useDebouncedValue } from "@app/core/hooks/useDebouncedValue";

type CityInputProps = {
  value: string;
  onChange: (city: string) => void;
  error?: string;
  label: string;
  required?: boolean;
};

export function CityInput({ value, onChange, error, label, required }: CityInputProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});

  // Синхронизация с управляемым `value` во время рендера, а не в эффекте:
  // иначе поле на один кадр показывает предыдущее значение.
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setQuery(value);
  }

  const updateMenuPosition = useCallback(() => {
    if (!triggerRef.current) return;
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - triggerRect.bottom - 12;
    const spaceAbove = triggerRect.top - 12;
    const openUpwards = spaceBelow < 220 && spaceAbove > spaceBelow;
    const maxHeight = Math.max(160, Math.min(322, openUpwards ? spaceAbove - 12 : spaceBelow - 12));
    setMenuStyle({
      position: "fixed",
      left: triggerRect.left,
      top: openUpwards ? undefined : triggerRect.bottom + 8,
      bottom: openUpwards ? viewportHeight - triggerRect.top + 8 : undefined,
      width: triggerRect.width,
      zIndex: 9999,
      maxHeight,
    });
  }, []);

  // Fuzzy-перебор всего справочника городов дорогой — гоняем его только по осевшему вводу.
  const debouncedQuery = useDebouncedValue(query);

  const suggestions = useMemo(() => {
    if (!debouncedQuery || debouncedQuery.length < 1) return [];
    const results = extract(debouncedQuery, cities as string[], { limit: 10, cutoff: 50 });
    return results.map((r: [string, number, number]) => r[0]);
  }, [debouncedQuery]);

  // Exact match — case-insensitive
  const exactMatch = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return (cities as string[]).find((c) => c.toLowerCase() === q) ?? null;
  }, [query]);

  const selectCity = useCallback(
    (city: string) => {
      setQuery(city);
      onChange(city);
      setOpen(false);
      setHighlightedIndex(0);
    },
    [onChange],
  );

  /** Закрытие без явного выбора: подставляем точное совпадение или первую подсказку. */
  const tryAutoSelect = useCallback(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      onChange("");
      return;
    }
    if (exactMatch) {
      selectCity(exactMatch);
      return;
    }
    if (suggestions.length > 0) {
      selectCity(suggestions[highlightedIndex] ?? suggestions[0]);
      return;
    }
    onChange(trimmed);
  }, [query, onChange, exactMatch, suggestions, highlightedIndex, selectCity]);

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (ref.current && !ref.current.contains(e.target as Node)) {
      if (menuRef.current?.contains(e.target as Node)) return;
      setOpen(false);
      tryAutoSelect();
    }
  }, [tryAutoSelect]);

  useEffect(() => {
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      updateMenuPosition();
      const handleViewportChange = () => updateMenuPosition();
      window.addEventListener("resize", handleViewportChange);
      window.addEventListener("scroll", handleViewportChange, true);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        window.removeEventListener("resize", handleViewportChange);
        window.removeEventListener("scroll", handleViewportChange, true);
      };
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, handleClickOutside, updateMenuPosition]);

  // Сбрасываем подсветку при смене списка подсказок — тоже во время рендера,
  // чтобы стрелками нельзя было попасть по индексу из прошлого списка.
  const [prevSuggestions, setPrevSuggestions] = useState(suggestions);
  if (suggestions !== prevSuggestions) {
    setPrevSuggestions(suggestions);
    setHighlightedIndex(0);
  }

  return (
    <div ref={ref} className="relative w-full">
      <label className="flex w-full flex-col gap-1">
        <span className="text-caption-sm text-text-primary">
          {label}
          {required && <span className="text-error"> *</span>}
        </span>
        <input
          ref={triggerRef}
          type="text"
          value={query}
          onChange={(e) => {
            const nextValue = e.target.value;
            setQuery(nextValue);
            onChange(nextValue);
            setOpen(true);
          }}
          onBlur={() => {
            tryAutoSelect();
          }}
          onFocus={() => { if (query.length > 0) setOpen(true); }}
          onKeyDown={(e) => {
            if (!open || suggestions.length === 0) {
              if (e.key === "Enter") {
                e.preventDefault();
                tryAutoSelect();
                setOpen(false);
              }
              return;
            }
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setHighlightedIndex((i) => Math.min(i + 1, suggestions.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setHighlightedIndex((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              const city = suggestions[highlightedIndex];
              if (city) selectCity(city);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          placeholder="Начните вводить город"
          aria-invalid={!!error}
          className={[
            "h-12 w-full rounded-full border border-border-subtle bg-surface p-3 text-input-lg outline-none transition-colors hover:cursor-pointer",
            "placeholder:text-tint-foreground",
            error
              ? "border-error text-error focus:border-error"
              : "border-subtle text-text-primary focus:border-primary-hover",
            "rounded-[24px]",
          ].join(" ")}
          style={{ cornerShape: "squircle" } as React.CSSProperties}
        />
        {error && <span className="text-[12px] font-light text-error">{error}</span>}
      </label>

      {open && suggestions.length > 0 &&
        createPortal(
          <div
            ref={menuRef}
            className="rounded-[24px] border border-primary bg-surface p-3 shadow-[0_16px_40px_rgba(22,28,45,0.12)] overflow-hidden flex flex-col"
            style={
              {
                ...menuStyle,
                cornerShape: "squircle",
              } as React.CSSProperties
            }
          >
            <div className="custom-scrollbar flex-1 min-h-0 overflow-y-auto overflow-x-hidden space-y-1 pr-[14px] -mr-[14px] [scrollbar-gutter:stable] rounded-[16px]">
              {suggestions.map((city, index) => (
                <button
                  key={city}
                  type="button"
                  onClick={() => selectCity(city)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={[
                    "flex w-full items-center gap-1 rounded-full px-2 py-1 text-left text-input-lg hover:cursor-pointer",
                    city === value
                      ? "bg-surface-elevated text-text-link"
                      : index === highlightedIndex
                        ? "bg-surface-elevated/70 text-text-link"
                        : "hover:bg-surface-elevated/70 hover:text-text-link",
                  ].join(" ")}
                  style={{ cornerShape: "squircle" } as React.CSSProperties}
                >
                  {city}
                </button>
              ))}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

export function isValidCity(city: string): boolean {
  return city.trim().length > 0;
}
