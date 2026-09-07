"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { Ellipsis } from "lucide-react";

export interface DropdownAction {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  variant?: "default" | "accent";
  /**
   * Destructive items рендерятся красным цветом (иконка + текст)
   * в idle и hover-состояниях. Переопределяет theme-цвета для этого пункта.
   */
  destructive?: boolean;
}

interface DropdownMenuProps {
  actions?: DropdownAction[];
  header?: React.ReactNode;
  children?: React.ReactNode;
  open?: boolean;
  onClose?: () => void;
  showTrigger?: boolean;
  placement?: "top" | "bottom";
  position?: { x: number; y: number };
  theme?: "light" | "dark";
  customOffset?: string;
  /**
   * Когда триггер находится вне DropdownMenu (showTrigger=false), передайте его ref,
   * чтобы клик по самому триггеру не закрывал меню — иначе onClose сработает раньше,
   * чем триггер успеет тогглить open, и меню «не закрывается».
   */
  triggerRef?: RefObject<HTMLElement | null>;
  triggerSurface?: boolean;
  /** Смещение выпадающего меню в пикселях (только для portal-режима с position). */
  offset?: { x?: number; y?: number };
  /** Включить вертикальный скролл (max-h-60) для длинных списков */
  scrollable?: boolean;
  /** Горизонтальное выравнивание выпадающего списка относительно контейнера */
  align?: "left" | "right";
}

export const dropdownTriggerSurfaceClassName =
  "flex h-5 w-5 shrink-0 items-center justify-center rounded-[8px] bg-bg-surface-base-default text-icon-secondary transition-colors hover:text-icon-primary focus-visible:ring-2 focus-visible:ring-primary";

export const dropdownTriggerSurfaceStyle = {
  cornerShape: "squircle",
} as CSSProperties;

const THEMES = {
  light: {
    container: "bg-bg-surface-base-default outline outline-border-subtle",
    item: "hover:bg-bg-surface-base-elevated",
    iconIdle: "text-text-primary",
    iconHover: "text-text-link-hover",
    textIdle: "text-text-primary",
    textHover: "text-text-link-hover",
  },
  dark: {
    container: "bg-[#26242e] outline outline-white/10",
    item: "hover:bg-white/10",
    iconIdle: "text-white",
    iconHover: "text-white",
    textIdle: "text-white",
    textHover: "text-white",
  },
} as const;

const ANIMATION_MS = 180;

// ─── Глобальный координатор открытых дропдаунов ────────────────────────────────
// Гарантирует, что в момент времени открыт максимум один DropdownMenu:
// при регистрации новой записи предыдущая получает команду close().
type DropdownRegistration = { close: () => void };
let currentOpenRegistration: DropdownRegistration | null = null;

function registerOpenDropdown(reg: DropdownRegistration) {
  if (currentOpenRegistration && currentOpenRegistration !== reg) {
    currentOpenRegistration.close();
  }
  currentOpenRegistration = reg;
}

function unregisterOpenDropdown(reg: DropdownRegistration) {
  if (currentOpenRegistration === reg) {
    currentOpenRegistration = null;
  }
}

export function DropdownMenu({
  actions,
  header,
  children,
  open: controlledOpen,
  onClose,
  showTrigger = true,
  placement = "bottom",
  position,
  theme = "light",
  customOffset,
  triggerRef,
  triggerSurface = false,
  scrollable = false,
  align = "right",
  offset,
}: DropdownMenuProps) {
  const t = THEMES[theme];
  const [internalOpen, setInternalOpen] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  // visible — применены «открытые» стили (триггерит CSS-transition при открытии).
  // На закрытие анимации нет — нода размонтируется мгновенно вместе с open=false.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!open) {
      const raf = requestAnimationFrame(() => setVisible(false));
      return () => cancelAnimationFrame(raf);
    }
    // open=true: рендерим в скрытом состоянии, затем на следующем кадре включаем visible
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => setVisible(true));
    });
    return () => cancelAnimationFrame(raf);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: PointerEvent) => {
      const target = e.target as Node;
      const insideRoot = ref.current?.contains(target);
      const insidePortal = portalRef.current?.contains(target);
      const insideTrigger = triggerRef?.current?.contains(target);
      if (!insideRoot && !insidePortal && !insideTrigger) {
        if (isControlled) onClose?.();
        else setInternalOpen(false);
      }
    };
    // Capture-фаза гарантирует закрытие даже внутри контейнеров, которые вызывают
    // stopPropagation. Pointer-событие одинаково работает для мыши и тачскрина.
    document.addEventListener("pointerdown", handler, true);
    return () => document.removeEventListener("pointerdown", handler, true);
  }, [open, isControlled, onClose, triggerRef]);

  const handleClose = useCallback(() => {
    if (isControlled) onClose?.();
    else setInternalOpen(false);
  }, [isControlled, onClose]);

  // Держим актуальный handleClose в ref, чтобы registry всегда имел свежую ссылку,
  // даже если onClose меняется между рендерами.
  const handleCloseRef = useRef(handleClose);
  useEffect(() => {
    handleCloseRef.current = handleClose;
  }, [handleClose]);

  // При открытии — регистрируемся в глобальном координаторе. Это автоматически
  // закрывает любой другой открытый дропдаун. При закрытии/размонтировании —
  // снимаем регистрацию.
  useEffect(() => {
    if (!open) return;
    const reg: DropdownRegistration = {
      close: () => handleCloseRef.current(),
    };
    registerOpenDropdown(reg);
    return () => unregisterOpenDropdown(reg);
  }, [open]);

  // Анимация только на открытии: для placement="top" «выезжает» снизу вверх,
  // для placement="bottom" — сверху вниз. На закрытии нода удаляется мгновенно.
  const animStyle: CSSProperties = {
    opacity: visible ? 1 : 0,
    transform: visible
      ? "translateY(0)"
      : placement === "top"
        ? "translateY(8px)"
        : "translateY(-8px)",
    transformOrigin: placement === "top" ? "bottom center" : "top center",
    transition: visible
      ? `opacity ${ANIMATION_MS}ms ease, transform ${ANIMATION_MS}ms ease`
      : "none",
    willChange: "opacity, transform",
  };

  return (
    <div className="relative" ref={ref}>
      {showTrigger && (
        <button
          type="button"
          aria-label="Открыть меню действий"
          onClick={() => {
            if (isControlled) return;
            setInternalOpen((prev) => !prev);
          }}
          className={
            triggerSurface
              ? dropdownTriggerSurfaceClassName
              : "flex h-5 w-5 items-center justify-center bg-transparent text-icon-secondary transition-colors hover:text-icon-hover focus-visible:ring-2 focus-visible:ring-primary !border-none"
          }
          style={triggerSurface ? dropdownTriggerSurfaceStyle : undefined}
        >
          <Ellipsis className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
        </button>
      )}

      {open && !position && (
        <div
          className={[
            "absolute z-50 pointer-events-none",
            align === "right" ? "right-0" : "left-0",
            placement === "top" ? "bottom-full" : "top-full mt-2",
            customOffset ? customOffset : placement === "top" ? "-translate-y-2" : "",
          ].join(" ")}
        >
          <div
            className={`p-3 rounded-[24px] flex flex-col gap-0.5 motion-reduce:transition-none! ${
              visible ? "pointer-events-auto" : "pointer-events-none"
            } ${t.container} ${scrollable ? "max-h-60 overflow-y-auto custom-scrollbar" : ""}`}
            style={{ cornerShape: "squircle", ...animStyle } as CSSProperties}
          >
            {header}
            {children
              ? children
              : actions?.map((action, i) => {
                  const iconCls = action.destructive
                    ? "text-[var(--color-text-error)]"
                    : hoveredIndex === i
                      ? t.iconHover
                      : t.iconIdle;
                  const textCls = action.destructive
                    ? "text-[var(--color-text-error)]"
                    : hoveredIndex === i
                      ? t.textHover
                      : t.textIdle;
                  return (
                    <button
                      key={i}
                      type="button"
                      onMouseEnter={() => setHoveredIndex(i)}
                      onMouseLeave={() => setHoveredIndex(null)}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        action.onClick();
                        handleClose();
                      }}
                      className={`w-full px-2 py-1 flex items-center gap-1.5 rounded-[16px] transition-colors ${t.item}`}
                      style={{ cornerShape: "squircle" } as CSSProperties}
                    >
                      {action.icon && (
                        <span
                          className={`w-4 h-4 shrink-0 flex items-center justify-center transition-colors ${iconCls}`}
                        >
                          {action.icon}
                        </span>
                      )}
                      <span
                        className={`text-input-lg leading-none whitespace-nowrap transition-colors ${textCls}`}
                      >
                        {action.label}
                      </span>
                    </button>
                  );
                })}
          </div>
        </div>
      )}

      {open &&
        position &&
        createPortal(
          <div
            ref={portalRef}
            className={`fixed z-9999 p-3 rounded-[24px] flex flex-col gap-0.5 motion-reduce:transition-none! ${
              visible ? "pointer-events-auto" : "pointer-events-none"
            } ${t.container}`}
            style={
              {
                top: position.y + (offset?.y ?? 0),
                left: position.x + (offset?.x ?? 0),
                cornerShape: "squircle",
                ...animStyle,
              } as CSSProperties
            }
          >
            {header}
            {children
              ? children
              : actions?.map((action, i) => {
                  const iconCls = action.destructive
                    ? "text-[var(--color-text-error)]"
                    : hoveredIndex === i
                      ? t.iconHover
                      : t.iconIdle;
                  const textCls = action.destructive
                    ? "text-[var(--color-text-error)]"
                    : hoveredIndex === i
                      ? t.textHover
                      : t.textIdle;
                  return (
                    <button
                      key={i}
                      type="button"
                      onMouseEnter={() => setHoveredIndex(i)}
                      onMouseLeave={() => setHoveredIndex(null)}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        action.onClick();
                        handleClose();
                      }}
                      className={`w-full px-2 py-1 flex items-center gap-1.5 rounded-[16px] transition-colors ${t.item}`}
                      style={{ cornerShape: "squircle" } as CSSProperties}
                    >
                      {action.icon && (
                        <span
                          className={`w-4 h-4 shrink-0 flex items-center justify-center transition-colors ${iconCls}`}
                        >
                          {action.icon}
                        </span>
                      )}
                      <span
                        className={`text-input-lg leading-none whitespace-nowrap transition-colors ${textCls}`}
                      >
                        {action.label}
                      </span>
                    </button>
                  );
                })}
          </div>,
          document.body,
        )}
    </div>
  );
}
