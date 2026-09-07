"use client"

import { X } from "lucide-react"
import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"
import { createPortal } from "react-dom"

interface ToastBannerProps {
  children: ReactNode
  /** Уникальный id текущего тоста. Используется вместо referential equality children
   *  чтобы определить, что тост сменился и нужен новый показ/таймер. */
  keyId?: string
  onClose?: () => void
  autoHideDuration?: number
  className?: string
}

export function ToastBanner({
  children,
  keyId,
  onClose,
  autoHideDuration = 5000,
  className = "",
}: ToastBannerProps) {
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastKeyRef = useRef<string | undefined>(undefined)

  const handleClose = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setVisible(false)
  }, [])

  // Сбрасываем visible и перезапускаем таймер только при смене keyId
  useEffect(() => {
    const changed = lastKeyRef.current !== keyId
    if (!changed) return
    lastKeyRef.current = keyId
    setVisible(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    if (autoHideDuration) {
      timerRef.current = setTimeout(() => handleClose(), autoHideDuration)
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [keyId, autoHideDuration, handleClose])

  const handleTransitionEnd = () => {
    if (!visible && onClose) {
      onClose()
    }
  }

  return createPortal(
    <div
      onTransitionEnd={handleTransitionEnd}
      role="status"
      aria-live="polite"
      className={[
        "fixed top-6 left-1/2 -translate-x-1/2 z-[9999]",
        "w-[480px] max-w-[calc(100vw-2rem)]",
        "p-3 bg-bg-surface-base-default rounded-[24px]",
        "shadow-[0px_11px_20px_0px_rgba(51,47,83,0.12)]",
        "inline-flex justify-start items-start gap-2",
        "transition-all duration-300 ease-out",
        visible
          ? "opacity-100 translate-y-0"
          : "opacity-0 -translate-y-full",
        className,
      ].join(" ")}
      style={{ cornerShape: "squircle" } as React.CSSProperties}
    >
      <div className="flex-1 min-w-0">{children}</div>

      <button
        type="button"
        onClick={handleClose}
        className="shrink-0 size-4 flex items-center justify-center text-icon-primary hover:opacity-80 transition-opacity"
        aria-label="Закрыть"
      >
        <X className="size-4" strokeWidth={1.5} />
      </button>
    </div>,
    document.body,
  )
}
