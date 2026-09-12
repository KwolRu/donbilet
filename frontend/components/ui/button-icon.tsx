"use client";

import { forwardRef } from "react";
import type { ReactNode, ButtonHTMLAttributes, CSSProperties } from "react";

interface ButtonIconProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
  icon: ReactNode;
  size?: "small";
  state?: "linear" | "secondary";
  /** Семантический модификатор оформления — не путать с HTML button type */
  variantType?: "normal";
  /** HTML button type — оставляем как есть, default "button" */
  type?: "button" | "submit" | "reset";
}

/**
 * ButtonIcon — иконочная кнопка из дизайн-системы.
 *
 * forwardRef нужен, чтобы dnd-kit мог пристегнуть setActivatorNodeRef
 * прямо к <button>, превратив её в drag-handle. Без forwardRef ref теряется
 * на функциональном компоненте и события указателя не подключаются — drag
 * визуально работает, но реально не двигает ничего.
 */
export const ButtonIcon = forwardRef<HTMLButtonElement, ButtonIconProps>(
  function ButtonIcon(
    {
      icon,
      size = "small",
      state = "linear",
      variantType = "normal",
      className = "",
      type = "button",
      style,
      ...props
    },
    ref,
  ) {
    return (
      <div
        data-size={size}
        data-state={state}
        data-type={variantType}
        className="inline-flex items-start justify-start"
      >
        <button
          ref={ref}
          type={type}
          className={[
            "flex items-center justify-center gap-1 overflow-hidden rounded-[24px] p-3 transition-colors disabled:cursor-not-allowed",
            state === "secondary"
              ? "bg-secondary text-white hover:bg-secondary-hover outline-none [&_svg]:text-white"
              : "bg-[var(--bg-button-linear-normal,#ffffff)] outline outline-1 outline-offset-[-1px] outline-[var(--border-button-linear-normal,#f6f6f6)] hover:outline-text-link-hover",
            className,
          ].join(" ")}
          style={{ cornerShape: "squircle", ...style } as CSSProperties}
          {...props}
        >
          <div className={`relative flex h-4 w-4 items-center justify-center overflow-hidden [&_svg]:h-4 [&_svg]:w-4 ${state === "secondary" ? "text-white" : "text-text-primary"}`}>
            {icon}
          </div>
        </button>
      </div>
    );
  },
);
