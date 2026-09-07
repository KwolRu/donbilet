import type { CSSProperties, ReactNode } from "react";
import { HoverTooltip } from "@/components/common/hover-tooltip";

const squircle = { cornerShape: "squircle" } as CSSProperties;

type Props = {
  children: ReactNode;
  className?: string;
  textClassName?: string;
  title?: string;
  /** Полный текст во всплывающей подсказке при наведении (через HoverTooltip). */
  hoverTooltip?: string;
};

/** Компактная плашка для меток (время, ставка и т.п.) — squircle 8px. */
export function InfoBadge({
  children,
  className = "",
  textClassName,
  title,
  hoverTooltip,
}: Props) {
  const textStyles = textClassName ?? "text-[14px] leading-[110%]";

  const badge = (
    <span
      title={hoverTooltip ? undefined : title}
      className={`inline-flex shrink-0 rounded-[8px] bg-bg-surface-base-layout p-1 font-[Inter] text-text-primary ${textStyles} ${className}`}
      style={squircle}
    >
      {children}
    </span>
  );

  if (!hoverTooltip) return badge;

  return (
    <HoverTooltip content={hoverTooltip} wrapperClassName="inline-flex">
      {badge}
    </HoverTooltip>
  );
}
