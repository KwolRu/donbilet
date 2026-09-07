import { X } from "lucide-react";
import type { ReactNode } from "react";

type StatusBadgeProps = {
  text: string;
  color: string;
  size?: "small" | "default";
  className?: string;
  maxTextWidthClassName?: string;
  textColor?: string;
  /** Иконка слева от подписи (наследует `textColor` через currentColor). */
  icon?: ReactNode;
  onRemove?: () => void;
  removeAriaLabel?: string;
};

export function StatusBadge({
  text,
  color,
  size = "small",
  className,
  maxTextWidthClassName = "max-w-[140px]",
  textColor = "var(--color-text-inverse)",
  icon,
  onRemove,
  removeAriaLabel,
}: StatusBadgeProps) {
  return (
    <div
      className={[
        "inline-flex max-w-full items-center justify-center gap-1.5 overflow-visible rounded-full px-2 transition-colors",
        size === "default" ? "py-1" : "py-0.5",
        onRemove ? "pr-1" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ backgroundColor: color }}
    >
      {icon ? (
        <span className="flex shrink-0 items-center self-center overflow-visible" style={{ color: textColor }}>
          {icon}
        </span>
      ) : null}
      <span
        title={text}
        className={["block truncate text-center text-caption-sm", maxTextWidthClassName]
          .filter(Boolean)
          .join(" ")}
        style={{ color: textColor }}
      >
        {text}
      </span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          aria-label={removeAriaLabel ?? `Удалить ${text}`}
        >
          <X className="h-3 w-3" style={{ color: textColor }} strokeWidth={1.5} />
        </button>
      )}
    </div>
  );
}

export const StatueBadge = StatusBadge;
