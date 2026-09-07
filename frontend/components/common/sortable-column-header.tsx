"use client"

import { ChevronsUpDown } from "lucide-react"
import type { SortState } from "@app/core/utils/table-sort"

type Props<T extends string> = {
  label: string
  columnKey: T
  sort: SortState<T>
  onSort: (key: T) => void
}

export function SortableColumnHeader<T extends string>({
  label,
  columnKey,
  sort,
  onSort,
}: Props<T>) {
  const isActive = sort?.key === columnKey

  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 text-body-regular text-text-secondary hover:text-text-primary transition-colors "


      onClick={() => onSort(columnKey)}
    >
      <span>{label}</span>
      <ChevronsUpDown
        className={`h-4 w-4 ${isActive ? "text-text-primary" : "text-text-tertiary"}`}
      />
    </button>
  )
}
