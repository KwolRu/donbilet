import type { ButtonHTMLAttributes, ReactNode } from "react"

interface IconPillButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> {
  children: ReactNode
  /** Визуальный вариант */
  variant?: "translucent" | "surface" | "primary" | "disabled"
  /** Класс обёртки (будет добавлен к базовому) */
  className?: string
  /** Квадратная иконка внутри 24×24 контейнера */
  withIconBox?: boolean
}

const VARIANT_CLS: Record<NonNullable<IconPillButtonProps["variant"]>, string> = {
  translucent: "bg-bg-surface-base-primary/20 text-text-inverse",
  surface: "bg-bg-surface-base-default text-icon-primary",
  primary: "bg-bg-button-primary-normal text-text-button-primary-normal",
  disabled: "bg-bg-button-primary-disabled text-icon-button-primary-disabled",
}

/**
 * Pill-кнопка из макета: p-3 + rounded-[24px] + squircle.
 * Используется в MediaViewer, ChatHeader, ChatInput (send/emoji/attach), Leads toolbar.
 */
export function IconPillButton({
  children,
  variant = "translucent",
  className = "",
  withIconBox = false,
  type = "button",
  ...rest
}: IconPillButtonProps) {
  return (
    <button
      type={type}
      {...rest}
      className={[
        "p-3 rounded-[24px] squircle inline-flex justify-center items-center gap-3 overflow-hidden transition-colors",
        VARIANT_CLS[variant],
        className,
      ].join(" ")}
    >
      {withIconBox ? (
        <span className="w-6 h-6 relative overflow-hidden flex items-center justify-center">
          {children}
        </span>
      ) : (
        children
      )}
    </button>
  )
}
