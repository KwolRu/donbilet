"use client";

import React from "react";
import { createPortal } from "react-dom";

let scrollLockCount = 0;
let originalBodyOverflow = "";
const subscribeToClient = () => () => undefined;

interface SidePanelProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  title?: string;
  description?: string;
  className?: string;
  header?: React.ReactNode;
  headerLeftAction?: React.ReactNode;
  hideDefaultHeader?: boolean;
}

export const SidePanel: React.FC<SidePanelProps> = ({
  open,
  onClose,
  children,
  footer,
  title,
  description,
  className = "",
  header,
  headerLeftAction,
  hideDefaultHeader = false,
}) => {
  const mounted = React.useSyncExternalStore(
    subscribeToClient,
    () => true,
    () => false,
  );
  const [animatedOpen, setAnimatedOpen] = React.useState(false);

  React.useEffect(() => {
    if (!mounted) return;

    const animationFrame = requestAnimationFrame(() => setAnimatedOpen(open));
    return () => cancelAnimationFrame(animationFrame);
  }, [mounted, open]);

  React.useEffect(() => {
    if (!mounted || !open) return;

    if (scrollLockCount === 0) {
      originalBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
    }

    scrollLockCount += 1;

    return () => {
      scrollLockCount = Math.max(0, scrollLockCount - 1);

      if (scrollLockCount === 0) {
        document.body.style.overflow = originalBodyOverflow;
        document.documentElement.style.overflow = "";
      }
    };
  }, [mounted, open]);

  React.useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!mounted) return null;

  return createPortal(
    <>
      <button
        type="button"
        onClick={onClose}
        aria-label="Закрыть боковую панель"
        tabIndex={-1}
        className={`fixed inset-0 z-[1000] bg-black/50 transition-opacity duration-300 motion-reduce:transition-none ${
          animatedOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={title ?? "Боковая панель"}
        aria-hidden={!animatedOpen}
        inert={!animatedOpen}
        className={`fixed top-0 right-0 z-[1010] flex h-full w-[474px] flex-col overflow-x-hidden overscroll-contain rounded-tl-3xl rounded-bl-3xl bg-white p-6 transition-transform duration-300 ease-in-out motion-reduce:transition-none ${
          animatedOpen ? "translate-x-0" : "pointer-events-none translate-x-full"
        } ${className}`}
      >
        {header ? (
          <div className="relative z-20 shrink-0 bg-white">{header}</div>
        ) : !hideDefaultHeader ? (
          <>
            <div className="relative z-20 flex shrink-0 items-center justify-between bg-white">
              <div>{headerLeftAction}</div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-6 w-6 items-center justify-center text-text-primary transition-opacity hover:text-text-link-hover focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="Закрыть"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M18 6L6 18M6 6L18 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>

            {(title || description) && (
              <div className="mt-4 flex shrink-0 flex-col mb-4">
                {title && <h2 className="text-heading-h1 text-text-primary">{title}</h2>}
                {description && (
                  <p className="text-note-small text-text-secondary">{description}</p>
                )}
              </div>
            )}
          </>
        ) : null}

        <div
          className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar   [scrollbar-gutter:stable]"
          onWheel={(e) => e.stopPropagation()}
        >
          {children}
        </div>

        {footer && <div className="shrink-0 pt-6">{footer}</div>}
      </div>
    </>,
    document.body,
  );
};
