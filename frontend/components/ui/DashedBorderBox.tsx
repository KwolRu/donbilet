type DashedBorderBoxProps = {
  children: React.ReactNode;
  className?: string;
  radius?: number;
  dash?: string;
  stroke?: string;
};

export function DashedBorderBox({
  children,
  className = "",
  radius = 24,
  dash = "8 8",
  stroke = "#d9d9d9",
}: DashedBorderBoxProps) {
  return (
    <div
      className={`relative ${className}`}
      style={{ cornerShape: "squircle" } as React.CSSProperties}
    >
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none "
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        <rect
          x="1"
          y="1"
          width="calc(100% - 2px)"
          height="calc(100% - 2px)"
          rx={radius}
          ry={radius}
          fill="none"
          stroke={stroke}
          strokeWidth="1"
          strokeDasharray={dash}
          strokeLinecap="round"
        />
      </svg>

      <div className="relative z-5">{children}</div>
    </div>
  );
}
