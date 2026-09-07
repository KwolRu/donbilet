import { X } from "lucide-react"
import type { ReactNode } from "react"

interface BadgeCloseProps {
  variant?: "default" | "success"
  onClose?: () => void
  children: ReactNode
}

export function BadgeClose({ variant = "default", onClose, children }: BadgeCloseProps) {
  const isSuccess = variant === "success"

  return (
    <div
      className={[
        "inline-flex items-center justify-center gap-1 rounded-[8px] p-1",
        isSuccess ? "bg-bg-state-base-success" : "bg-bg-surface-base-tertiary",
      ].join(" ")}
      style={{ cornerShape: "squircle" } as React.CSSProperties}
    >
      {children}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="relative flex items-center justify-center"
          aria-label="Удалить"
        >
          <X
            className={[
              "h-3 w-3",
              isSuccess ? "text-text-success" : "text-text-primary",
            ].join(" ")}
            strokeWidth={1.5}
          />
        </button>
      )}
    </div>
  )
}
