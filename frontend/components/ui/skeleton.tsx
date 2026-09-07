interface SkeletonProps {
  width?: number | string
  height?: number | string
  rounded?: "none" | "sm" | "md" | "lg" | "full"
  /** Применяет cornerShape: "squircle" через style. По умолчанию — true. */
  cornerShape?: boolean
  className?: string
}

/** Tailwind lg ≈ 12px → x2 = 24px, md ≈ 8px → x2 = 16px */
const roundedMap = {
  none: "",
  sm: "rounded-sm",
  md: "rounded-[16px]",
  lg: "rounded-[24px]",
  full: "rounded-full",
}

export function Skeleton({
  width,
  height,
  rounded = "md",
  cornerShape = true,
  className = "",
}: SkeletonProps) {
  return (
    <div
      className={`skeleton-shimmer ${roundedMap[rounded]} ${className}`}
      style={{
        width: width ?? "100%",
        height: height ?? "100%",
        ...(cornerShape ? ({ cornerShape: "squircle" } as React.CSSProperties) : {}),
      }}
    />
  )
}
