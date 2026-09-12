"use client";

import { ChevronDown, ChevronUp, Search } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Checkbox } from "@/components/ui/checkbox";
import {
  getSelectMenuLayout,
  type SelectMenuPlacement,
} from "@/components/ui/select-menu-layout";
import { extract } from "fuzzball";

type SelectOption = {
  label: string;
  value: string;
};

type SelectProps = {
  label: string;
  required?: boolean;
  placeholder?: string;
  value?: string[];
  options: SelectOption[];
  disabled?: boolean;
  disabledOptions?: string[];
  error?: string;
  mode?: "single" | "multi";
  searchable?: boolean;
  maxVisibleBadges?: number;
  showOptionTooltips?: boolean;
  showChevron?: boolean;
  menuPosition?: "inline" | "portal";
  menuPlacement?: SelectMenuPlacement;
  scrollSelectedIntoView?: boolean;
  /** В multi-режиме не показывать чекбоксы слева от пунктов (например, ставки). */
  hideMultiCheckboxes?: boolean;
  className?: string;
  triggerClassName?: string;
  /** Открыть список сразу после монтирования интерактивного поля. */
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onChange?: (value: string[]) => void;
};

const XIcon = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 12 12"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="shrink-0"
  >
    <path d="M9 3L3 9M3 3L9 9" stroke="#191919" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export function Select({
  label,
  required = false,
  placeholder = "Выберите",
  value = [],
  options,
  disabled,
  disabledOptions,
  error,
  mode = "multi",
  searchable = false,
  maxVisibleBadges = 3,
  showChevron = true,
  menuPosition = "portal",
  menuPlacement = "auto",
  scrollSelectedIntoView = false,
  hideMultiCheckboxes = false,
  className = "",
  triggerClassName = "",
  defaultOpen = false,
  onOpenChange,
  onChange,
}: SelectProps) {
  const disabledSet = useMemo(() => new Set(disabledOptions ?? []), [disabledOptions]);
  const [open, setOpen] = useState(defaultOpen);
  const [search, setSearch] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const chipsWrapRef = useRef<HTMLSpanElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [visibleCountByWidth, setVisibleCountByWidth] = useState(maxVisibleBadges);

  const changeOpen = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen);
      onOpenChange?.(nextOpen);
    },
    [onOpenChange],
  );

  /** Apply coordinates directly to DOM node — avoids React re-render between mount and positioning */
  const updateMenuPosition = useCallback(() => {
    if (!triggerRef.current || !menuRef.current) return;
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const layout = getSelectMenuLayout({
      triggerTop: triggerRect.top,
      triggerBottom: triggerRect.bottom,
      viewportHeight,
      placement: menuPlacement,
    });

    const menu = menuRef.current;
    menu.style.position = "fixed";
    menu.style.left = `${triggerRect.left}px`;
    menu.style.width = `${triggerRect.width}px`;
    menu.style.zIndex = "9999";
    menu.style.maxHeight = `${layout.maxHeight}px`;
    if (layout.openUpwards) {
      menu.style.top = "";
      menu.style.bottom = `${layout.bottom}px`;
    } else {
      menu.style.bottom = "";
      menu.style.top = `${layout.top}px`;
    }
  }, [menuPlacement]);

  const filtered = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase().trim();

    // 1) Exact substring по label или value (например "мос", "UTC+3", "Europe/Moscow")
    const exactMatches = options.filter(
      (o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q),
    );

    // 2) Fuzzy fallback с более мягким порогом
    const fuzzyResults = extract(
      search,
      options.map((o) => o.label),
      { limit: 50, cutoff: 20 },
    );
    const fuzzyMatched = new Set(fuzzyResults.map((r: [string, number, number]) => r[0]));
    const fuzzyMatches = options.filter((o) => fuzzyMatched.has(o.label));

    // Объединяем, exact идут первыми
    const seen = new Set(exactMatches.map((o) => o.value));
    const result = [...exactMatches];
    for (const o of fuzzyMatches) {
      if (!seen.has(o.value)) {
        seen.add(o.value);
        result.push(o);
      }
    }
    return result;
  }, [options, search]);

  // Exact match — case-insensitive по label или value
  const exactMatch = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q || !searchable) return null;
    return options.find((o) => o.label.toLowerCase() === q || o.value.toLowerCase() === q) ?? null;
  }, [search, options, searchable]);

  const tryAutoSelect = useCallback(() => {
    if (!searchable || mode !== "single" || !search.trim()) return;
    if (exactMatch && !disabledSet.has(exactMatch.value) && !value.includes(exactMatch.value)) {
      onChange?.([exactMatch.value]);
      setSearch("");
      return;
    }
    const firstEnabled = filtered.find((o) => !disabledSet.has(o.value));
    if (firstEnabled && !value.includes(firstEnabled.value)) {
      onChange?.([firstEnabled.value]);
      setSearch("");
    }
  }, [disabledSet, exactMatch, filtered, mode, onChange, search, searchable, value]);

  // Закрытие по клику вне
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!rootRef.current) return;
      if (rootRef.current.contains(event.target as Node)) return;
      if (menuRef.current?.contains(event.target as Node)) return;

      // Не закрывать если координаты клика внутри границ меню
      // (нативный скроллбар может не считаться потомком узла меню)
      if (menuRef.current) {
        const rect = menuRef.current.getBoundingClientRect();
        if (
          event.clientX >= rect.left &&
          event.clientX <= rect.right &&
          event.clientY >= rect.top &&
          event.clientY <= rect.bottom
        ) {
          return;
        }
      }

      tryAutoSelect();
      changeOpen(false);
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [changeOpen, open, tryAutoSelect]);

  const selected = useMemo(
    () => options.filter((option) => value.includes(option.value)),
    [options, value],
  );

  const selectedKey = selected.map((item) => item.value).join("|");

  // Вычисляем сколько бейджей влезает по ширине (до paint, чтобы размеры триггера
  // были финальными к моменту измерения меню)
  useLayoutEffect(() => {
    const triggerElement = triggerRef.current;
    if (!triggerElement) return;

    const compute = () => {
      // 48 = chevron (24) + его отступы, 24 = padding кнопки
      const chevronReserve = showChevron ? 48 : 8;
      const availableWidth = Math.max(0, triggerElement.clientWidth - chevronReserve - 24);
      if (!availableWidth) return;

      let used = 0;
      let visible = 0;
      // Резервируем место под "... N ×" бейдж (~52px)
      const reserveForCounter = 52;

      for (let i = 0; i < selected.length; i++) {
        const item = selected[i];
        // Ширина бейджа: текст (~7px/символ, макс 90px) + крестик (12) + gap (4) + паддинги (16)
        const textWidth = Math.min(item.label.length * 7, 90);
        const itemWidth = textWidth + 12 + 4 + 16;

        const isLast = i === selected.length - 1;
        const neededWidth = isLast ? used + itemWidth : used + itemWidth + reserveForCounter;

        if (neededWidth > availableWidth) break;

        used += itemWidth + 4; // +4 gap между бейджами
        visible += 1;
      }

      const nextVisible = Math.max(0, visible);
      setVisibleCountByWidth((prev) => (prev === nextVisible ? prev : nextVisible));
    };

    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, [selectedKey, selected, showChevron]);

  useLayoutEffect(() => {
    if (!open) return;

    const menu = menuRef.current;
    if (menu) menu.style.opacity = "0";

    // Сразу применяем позицию (DOM mutation, не state) — блокирует paint
    updateMenuPosition();

    // ResizeObserver на триггер — пересчёт при изменении размеров (бейджи, шрифты)
    const ro = new ResizeObserver(() => {
      updateMenuPosition();
    });
    if (triggerRef.current) ro.observe(triggerRef.current);

    const handleResize = () => {
      if (menu) menu.style.opacity = "0";
      updateMenuPosition();
    };
    window.addEventListener("resize", handleResize);

    // Track position continuously to handle scroll in any container
    let rafTrack: number;
    const trackPosition = () => {
      updateMenuPosition();
      rafTrack = requestAnimationFrame(trackPosition);
    };
    rafTrack = requestAnimationFrame(trackPosition);

    // Показываем меню только после того, как браузер успел сделать layout
    // с уже применёнными координатами
    const raf = requestAnimationFrame(() => {
      if (menu) menu.style.opacity = "1";
    });

    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(rafTrack);
      ro.disconnect();
      window.removeEventListener("resize", handleResize);
    };
  }, [open, search, selectedKey, updateMenuPosition, visibleCountByWidth]);

  const visibleSelectedCount = Math.min(maxVisibleBadges, visibleCountByWidth || maxVisibleBadges);
  const hiddenCount = Math.max(0, selected.length - visibleSelectedCount);
  const visibleSelected = selected.slice(0, visibleSelectedCount);

  // Удалить один конкретный бейдж
  const handleRemoveBadge = (e: React.MouseEvent, optionValue: string) => {
    e.stopPropagation();
    e.preventDefault();
    onChange?.(value.filter((v) => v !== optionValue));
  };

  // Удалить все скрытые элементы (только незадизейбленные)
  const handleRemoveHidden = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onChange?.(visibleSelected.filter((s) => !isOptionDisabled(s.value)).map((s) => s.value));
  };

  /** Stop wheel events from bubbling to document so body scroll-lock stays clean */
  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
  };

  const isOptionDisabled = (optionValue: string) => disabledSet.has(optionValue);

  const toggleOption = (optionValue: string, isDisabled: boolean) => {
    if (isDisabled) return;
    if (mode === "single") {
      onChange?.([optionValue]);
      changeOpen(false);
    } else {
      const checked = value.includes(optionValue);
      const next = checked ? value.filter((item) => item !== optionValue) : [...value, optionValue];
      onChange?.(next);
    }
  };

  return (
    <div ref={rootRef} className={["relative w-full", className].join(" ")} onWheel={handleWheel}>
      {/* Лейбл */}
      <label
        className={`mb-1 block text-caption-sm ${disabled ? "text-tertiary" : "text-text-primary"}`}
      >
        {label}
        {required ? <span className="text-error"> *</span> : null}
      </label>

      {/* Триггер */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        className={[
          "flex min-w-0 h-12 w-full items-center rounded-full border p-3 text-left text-input-lg transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          showChevron ? "justify-between" : "justify-start gap-1",
          disabled
            ? "cursor-not-allowed border-border-subtle text-tint-foreground"
            : error
              ? "border-error text-error"
              : open
                ? "border-[var(--color-text-link-hover)]"
                : "border-border-subtle text-text-primary hover:border-border-default",
          triggerClassName,
        ].join(" ")}
        onClick={() => {
          if (disabled) return;
          changeOpen(!open);
        }}
        onWheel={(e) => e.stopPropagation()}
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="listbox"
        style={{ cornerShape: "squircle" } as React.CSSProperties}
      >
        {/* Бейджи мультиселекта или плейсхолдер/текст */}
        {mode === "multi" && selected.length > 0 ? (
          <span
            ref={chipsWrapRef}
            className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden  user-select-none"
          >
            {/* Видимые бейджи */}
            {visibleSelected.map((item, index) => (
              <span
                key={item.value}
                className={[
                  "inline-flex shrink-0 items-center gap-1 rounded-md bg-surface-elevated px-2 py-1 text-xs text-text-link-hover whitespace-nowrap user-select-none",
                  selected.length > 9
                    ? "max-w-[134px]"
                    : index === 0
                      ? "max-w-[154px]"
                      : index === 1
                        ? "max-w-[135px]"
                        : "",
                ].join(" ")}
              >
                <span className="truncate min-w-0 flex-1 user-select-none">{item.label}</span>
                {isOptionDisabled(item.value) ? null : (
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label={`Удалить ${item.label}`}
                    className="flex cursor-pointer items-center justify-center"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                    }}
                    onClick={(e) => handleRemoveBadge(e, item.value)}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter" && e.key !== " ") return;
                      e.preventDefault();
                      onChange?.(value.filter((v) => v !== item.value));
                    }}
                  >
                    <XIcon />
                  </span>
                )}
              </span>
            ))}

            {/* Разделитель "..." если есть скрытые */}
            {hiddenCount > 0 && (
              <>
                <span className="shrink-0 text-sm text-text-secondary">...</span>

                {/* Бейдж со счётчиком скрытых */}
                <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-surface-elevated px-2 py-1 text-xs text-text-link-hover whitespace-nowrap user-select-none ml-0.5">
                  <span className="user-select-none">{hiddenCount > 9 ? "9+" : hiddenCount}</span>
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label={`Удалить ещё ${hiddenCount > 9 ? "9+" : hiddenCount}`}
                    className="flex cursor-pointer items-center justify-center"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                    }}
                    onClick={handleRemoveHidden}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter" && e.key !== " ") return;
                      e.preventDefault();
                      onChange?.(visibleSelected.map((s) => s.value));
                    }}
                  >
                    <XIcon />
                  </span>
                </span>
              </>
            )}
          </span>
        ) : (
          <span
            className={[
              disabled
                ? "text-tint-foreground"
                : error
                  ? "text-error"
                  : selected.length > 0
                    ? "text-text-primary"
                    : "text-tint-foreground",
              "min-w-0 flex-1 truncate text-left user-select-none",
            ].join(" ")}
          >
            {mode === "single" && selected.length > 0 ? selected[0].label : placeholder}
          </span>
        )}

        {showChevron ? (
          <span className="relative size-6 shrink-0">
            <ChevronDown
              className={`absolute inset-0 m-auto size-6 stroke-1.5 transition-all duration-200 ease-in-out ${
                open ? "scale-0 -rotate-90" : "scale-100 rotate-0"
              } ${disabled ? "text-tint-foreground" : "text-text-primary"}`}
            />
            <ChevronUp
              className={`absolute inset-0 m-auto size-6 stroke-1.5 transition-all duration-200 ease-in-out ${
                open ? "scale-100 rotate-0" : "scale-0 rotate-90"
              } ${disabled ? "text-tint-foreground" : "text-text-primary"}`}
            />
          </span>
        ) : null}
      </button>

      {(() => {
        if (!open || disabled) return null;

        const menu = (
          <div
            ref={menuRef}
            data-ui-select-menu="true"
            className={[
              "rounded-[24px] border border-[var(--color-text-link-hover)] bg-surface p-3 shadow-[0_16px_40px_rgba(22,28,45,0.12)] overflow-hidden flex flex-col",
              menuPosition === "inline" ? "absolute left-0 right-0 top-full z-50 mt-2 w-full" : "",
            ].join(" ")}
            style={{ cornerShape: "squircle" } as React.CSSProperties}
            onWheel={(e) => e.stopPropagation()}
          >
            {searchable && (
              <>
                <div className="flex h-[34px] items-center px-1 pt-1 pb-3">
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Поиск"
                    className="w-full bg-transparent text-input-lg text-text-primary outline-none placeholder:text-tint-foreground"
                  />
                  <Search className="size-4 shrink-0 text-text-primary" />
                </div>
                <div className="mb-2 h-px bg-tint" />
              </>
            )}

            <div className="custom-scrollbar flex-1 min-h-0 overflow-auto space-y-1  rounded-[16px]">
              {filtered.map((option) => {
                const checked = value.includes(option.value);
                const isOptDisabled = isOptionDisabled(option.value);

                return (
                  <div
                    key={option.value}
                    role="button"
                    tabIndex={isOptDisabled ? -1 : 0}
                    data-select-scroll-target={
                      scrollSelectedIntoView && mode === "single" && checked ? "true" : undefined
                    }
                    className={[
                      "flex w-full items-center gap-2 rounded-full px-3 py-2 text-left text-input-lg transition-colors user-select-none",
                      isOptDisabled
                        ? "cursor-not-allowed text-tint-foreground opacity-50"
                        : checked
                          ? "cursor-pointer bg-surface-elevated text-text-link-hover"
                          : "cursor-pointer text-text-primary hover:bg-surface-elevated/70 hover:text-text-link-hover",
                    ].join(" ")}
                    style={{ cornerShape: "squircle" } as React.CSSProperties}
                    onClick={() => toggleOption(option.value, isOptDisabled)}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter" && event.key !== " ") return;
                      if (isOptDisabled) return;
                      event.preventDefault();
                      toggleOption(option.value, isOptDisabled);
                    }}
                  >
                    {mode === "multi" && !hideMultiCheckboxes ? (
                      <div className="pointer-events-none flex shrink-0 items-center justify-center">
                        <Checkbox checkedState={checked} />
                      </div>
                    ) : null}
                    <span className="truncate user-select-none">{option.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );

        return menuPosition === "portal" ? createPortal(menu, document.body) : menu;
      })()}

      {/* Ошибка */}
      {error ? <p className="mt-1 text-[12px] font-light text-error">{error}</p> : null}
    </div>
  );
}
