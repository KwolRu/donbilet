interface OnlineDotProps {
  isOnline?: boolean
  /** Размер точки */
  size?: "sm" | "md"
  /** Класс для позиционирования. По умолчанию — absolute top-right */
  className?: string
}

const SIZE_MAP = {
  sm: "size-2",
  md: "size-2.5",
} as const

export function OnlineDot({
  isOnline = false,
  size = "md",
  className = "absolute top-0 right-0",
}: OnlineDotProps) {
  return (
    <span
      className={[
        SIZE_MAP[size],
        "rounded-full border-2 border-bg-surface-base-default",
        isOnline
          ? "bg-bg-state-base-success-inverse"
          : "bg-surface-base-disabled",
        className,
      ].join(" ")}
    />
  )
}
