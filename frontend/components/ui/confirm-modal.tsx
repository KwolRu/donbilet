"use client";

import { useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = "Подтвердить",
  cancelLabel = "Отмена",
  destructive = false,
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-label="Закрыть подтверждение"
      />
      <div
        className="relative w-[400px] max-w-[calc(100vw-2rem)] rounded-[24px] bg-white p-6 shadow-[0_16px_40px_rgba(22,28,45,0.12)]"
        style={{ cornerShape: "squircle" } as React.CSSProperties}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <h3 id={titleId} className="text-text-primary text-[18px] font-medium leading-[22px]">
          {title}
        </h3>
        {description ? (
          <p className="mt-2 text-text-secondary text-sm leading-5">{description}</p>
        ) : null}

        <div className="mt-6 flex items-center justify-end gap-2">
          <Button variant="linear" size="small" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? "red" : "primary"}
            size="small"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
