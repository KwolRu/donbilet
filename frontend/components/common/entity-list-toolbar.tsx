"use client";

import { Trash2, Undo, X } from "lucide-react";
import { StatusSegmented } from "@/components/common/status-segmented";
import { TableRangeControl } from "@/components/common/table-range-control";
import { Button } from "@/components/ui/button";
import { FilterButton } from "@/components/common/filter-button";

type SegmentValue = "current" | "archived";

type Props = {
  total: number;
  rowsPerPage: number;
  segment: SegmentValue;
  selectedCount: number;
  activeFilterCount?: number;
  onSegmentChange: (value: SegmentValue) => void;
  onClearSelection: () => void;
  onArchiveSelected: () => void;
  onOpenSettings: () => void;
  onOpenFilter: () => void;
};

export function EntityListToolbar({
  total,
  rowsPerPage,
  segment,
  selectedCount,
  activeFilterCount = 0,
  onSegmentChange,
  onClearSelection,
  onArchiveSelected,
  onOpenSettings,
  onOpenFilter,
}: Props) {
  const visibleCount = Math.min(rowsPerPage, total);

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <p className="text-h2 text-text-primary">{`${visibleCount} из ${total}`}</p>
        <TableRangeControl from={1} to={visibleCount} onOpenSettings={onOpenSettings} />
        <StatusSegmented value={segment} onChange={onSegmentChange} />
        {selectedCount > 0 && (
          <>
            <button
              type="button"
              onClick={onClearSelection}
              className="inline-flex items-center gap-1 h-10 text-body-regular text-text-secondary hover:text-text-primary transition-colors"
            >
              <X className="size-4" />
              {`Выбрано: ${selectedCount}`}
            </button>
            <Button
              size="small"
              variant="secondary"
              iconLeft={segment === "current" ? <Trash2 /> : <Undo />}
              onClick={onArchiveSelected}
            >
              {segment === "current" ? "Архивировать" : "Вернуть"}
            </Button>
          </>
        )}
      </div>

      <FilterButton activeCount={activeFilterCount} onClick={onOpenFilter} />
    </div>
  );
}
