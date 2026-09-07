"use client";

import { useEffect, useId, type CSSProperties, type ReactNode } from "react";
import { ArrowLeft, X } from "lucide-react";

type DrawerVariant = "default" | "compact";

type DrawerProps = {
  open: boolean;
  title?: string;
  onClose: () => void;
  onBack?: () => void;
  children: ReactNode;
  footer?: ReactNode;
  widthClassName?: string;
  variant?: DrawerVariant;
  ariaLabel?: string;
};

export function Drawer({
  open,
  title,
  onClose,
  onBack,
  children,
  footer,
  widthClassName = "w-[520px]",
  variant = "default",
  ariaLabel,
}: DrawerProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  const compact = variant === "compact";
  const resolvedWidthClassName = compact ? "w-[474px]" : widthClassName;

  return (
    <div className="fixed inset-0 z-[70]">
      <button
        type="button"
        className="absolute inset-0 bg-black/20"
        onClick={onClose}
        aria-label="Закрыть"
      />
      <aside
        className={`absolute right-0 top-0 flex h-full ${resolvedWidthClassName} flex-col overscroll-contain bg-bg-surface-base-default ${compact ? "rounded-l-[24px] shadow-popover" : "border-l border-border-subtle"}`}
        style={{ cornerShape: "squircle" } as CSSProperties}
        role="dialog"
        aria-modal="true"
        aria-label={title ? undefined : ariaLabel}
        aria-labelledby={title ? titleId : undefined}
      >
        <div
          className={
            compact
              ? "flex flex-col gap-4 bg-white p-6 pb-4"
              : "flex items-center justify-between px-8 pb-4 pt-8"
          }
        >
          {compact ? (
            <div className={`flex items-center ${onBack ? "justify-between" : "justify-end"}`}>
              {onBack ? (
                <button
                  type="button"
                  onClick={onBack}
                  className="flex h-6 w-6 items-center justify-center text-icon-primary transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-primary"
                  aria-label="Назад"
                >
                  <ArrowLeft className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                </button>
              ) : null}
              <button
                type="button"
                onClick={onClose}
                className="flex h-6 w-6 items-center justify-center text-icon-primary transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="Закрыть"
              >
                <X className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              </button>
            </div>
          ) : null}
          {title ? (
            <h2
              id={titleId}
              className={
                compact
                  ? "text-h1 w-full text-pretty text-text-primary"
                  : "text-[48px] font-medium leading-[1.1] text-text-primary"
              }
            >
              {title}
            </h2>
          ) : null}
          {!compact ? (
            <button
              type="button"
              onClick={onClose}
              className="text-text-secondary transition-colors hover:text-text-primary focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Закрыть"
            >
              <X className="h-7 w-7" aria-hidden="true" />
            </button>
          ) : null}
        </div>

        <div
          className={
            compact
              ? "custom-scrollbar min-h-0 flex-1 overflow-y-auto px-6 pb-6"
              : "flex-1 overflow-y-auto px-8 pb-4"
          }
        >
          {children}
        </div>

        {footer ? (
          <div
            className={
              compact ? "shrink-0 border-t border-border-subtle bg-white p-6" : "px-8 pb-6 pt-4"
            }
          >
            {footer}
          </div>
        ) : null}
      </aside>
    </div>
  );
}
