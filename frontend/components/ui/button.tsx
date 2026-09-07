"use client";
import { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "linear" | "red" | "surface";
type ButtonSize = "large" | "small" | "icon-large" | "icon-small";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  loading?: boolean;
};

const baseClasses =
  "inline-flex items-center justify-center rounded-full transition-colors hover:cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed";

const sizeClasses: Record<ButtonSize, string> = {
  large: "h-12 px-6 gap-2 text-button-lg [&_svg]:size-6 py-3 [&_svg]:stroke-2",
  small: "h-10 px-4 gap-2 text-button-sm [&_svg]:size-4 py-3 [&_svg]:stroke-2",
  "icon-large": "h-12 w-12 [&_svg]:size-6 [&_svg]:stroke-1.5",
  "icon-small": "h-10 w-10 [&_svg]:size-4 [&_svg]:stroke-1.5",
};

const interactiveVariantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-white hover:bg-primary-hover disabled:bg-tint disabled:text-tint-foreground",
  secondary:
    "bg-secondary text-white hover:bg-secondary-hover disabled:bg-tint disabled:text-tint-foreground",
  ghost: "bg-transparent text-dark-grey hover:text-text-link disabled:text-tint-foreground",
  linear:
    "bg-transparent border border-tint text-dark-grey hover:border-linear-hover disabled:border-tint disabled:text-tint-foreground ",
  red: "bg-[var(--color-text-error)] text-white hover:opacity-90 disabled:bg-tint disabled:text-tint-foreground",
  surface:
    "bg-[var(--bg-surface-base-primary-20)] text-white hover:bg-[var(--bg-surface-base-primary-30)] !rounded-[16px] disabled:bg-tint disabled:text-tint-foreground",
};

export function Button({
  variant = "primary",
  size = "large",
  iconLeft,
  iconRight,
  className = "",
  children,
  type = "button",
  disabled,
  loading,
  onClick,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={[
        baseClasses,
        sizeClasses[size],
        interactiveVariantClasses[variant],
        className,
      ].join(" ")}
      onClick={onClick}
      {...props}
      style={
        {
          cornerShape: "squircle",
        } as React.CSSProperties
      }
    >
      {loading ? (
        <Loader2 className="animate-spin" />
      ) : (
        <>
          {iconLeft}
          {!size.startsWith("icon-") ? children : null}
          {iconRight}
        </>
      )}
    </button>
  );
}
