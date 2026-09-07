"use client";

import type { CSSProperties, ReactNode } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";

export function countActiveFilters(filters?: object | null): number {
  if (!filters) return 0;
  let count = 0;
  for (const value of Object.values(filters)) {
    if (value === undefined || value === null || value === "" || value === false) continue;
    if (Array.isArray(value)) {
      if (value.length > 0) count += 1;
    } else if (typeof value === "object") {
      if (Object.keys(value).length > 0) count += 1;
    } else {
      count += 1;
    }
  }
  return count;
}

export type FilterButtonProps = Omit<ButtonProps, "children" | "iconLeft" | "iconRight"> & {
  activeCount?: number;
  label?: ReactNode;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
};

export function FilterButton({
  activeCount = 0,
  label = "Фильтр",
  iconLeft = <SlidersHorizontal size={16} />,
  iconRight,
  size = "small",
  variant = "linear",
  className,
  ...props
}: FilterButtonProps) {
  const badge =
    activeCount > 0 ? (
      <span
        className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium leading-none text-white"
        style={{ cornerShape: "squircle" } as CSSProperties}
      >
        {activeCount}
      </span>
    ) : (
      iconRight
    );

  return (
    <Button
      size={size}
      variant={variant}
      iconLeft={iconLeft}
      iconRight={badge}
      className={className}
      {...props}
    >
      {label}
    </Button>
  );
}
