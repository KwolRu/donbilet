"use client";

import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CALENDAR_MONTHS, buildYearOptions } from "./calendar-utils";
import {
  CalendarPickerSelect,
  type CalendarPickerSelectOption,
} from "./calendar-picker-select";
import { CalendarMonth } from "./calendar-month";

export type CalendarPanelVariant = "dropdowns" | "simple";

type SingleProps = {
  mode: "single";
  selectedDate?: string | null;
  onDayClick: (isoDate: string) => void;
};

type RangeProps = {
  mode: "range";
  rangeStart?: string;
  rangeEnd?: string;
  onDayClick: (isoDate: string) => void;
};

type Props = {
  variant?: CalendarPanelVariant;
  viewYear: number;
  viewMonth: number;
  onViewChange: (next: { year: number; month: number }) => void;
  className?: string;
  today?: Date;
} & (SingleProps | RangeProps);

export function CalendarPanel({
  variant = "dropdowns",
  viewYear,
  viewMonth,
  onViewChange,
  className = "",
  today = new Date(),
  ...selection
}: Props) {
  const yearOptions = useMemo(
    () => buildYearOptions(viewYear, today.getFullYear()),
    [today, viewYear],
  );

  const monthOptions = useMemo<CalendarPickerSelectOption[]>(
    () => CALENDAR_MONTHS.map((month, index) => ({ label: month, value: String(index) })),
    [],
  );

  const yearSelectOptions = useMemo<CalendarPickerSelectOption[]>(
    () => yearOptions.map((year) => ({ label: String(year), value: String(year) })),
    [yearOptions],
  );

  const goToPreviousMonth = () => {
    if (viewMonth === 0) {
      onViewChange({ year: viewYear - 1, month: 11 });
      return;
    }
    onViewChange({ year: viewYear, month: viewMonth - 1 });
  };

  const goToNextMonth = () => {
    if (viewMonth === 11) {
      onViewChange({ year: viewYear + 1, month: 0 });
      return;
    }
    onViewChange({ year: viewYear, month: viewMonth + 1 });
  };

  return (
    <div className={className}>
      <div
        className={
          variant === "dropdowns"
            ? "mb-3 flex items-center gap-2"
            : "mb-3 flex items-center justify-between"
        }
      >
        <button type="button" onClick={goToPreviousMonth} aria-label="Предыдущий месяц">
          <ChevronLeft className="h-4 w-4 text-icon-primary" />
        </button>

        {variant === "dropdowns" ? (
          <>
            <CalendarPickerSelect
              value={String(viewMonth)}
              options={monthOptions}
              placeholder="Месяц"
              widthClassName="flex-1"
              onChange={(nextValue) =>
                onViewChange({ year: viewYear, month: Number(nextValue) })
              }
            />
            <CalendarPickerSelect
              value={String(viewYear)}
              options={yearSelectOptions}
              placeholder="Год"
              widthClassName="flex-1"
              onChange={(nextValue) =>
                onViewChange({ year: Number(nextValue), month: viewMonth })
              }
            />
          </>
        ) : (
          <span className="text-body-medium text-text-primary">
            {CALENDAR_MONTHS[viewMonth]} {viewYear}
          </span>
        )}

        <button type="button" onClick={goToNextMonth} aria-label="Следующий месяц">
          <ChevronRight className="h-4 w-4 text-icon-primary" />
        </button>
      </div>

      {selection.mode === "single" ? (
        <CalendarMonth
          year={viewYear}
          month={viewMonth}
          mode="single"
          selectedDate={selection.selectedDate}
          onDayClick={selection.onDayClick}
        />
      ) : (
        <CalendarMonth
          year={viewYear}
          month={viewMonth}
          mode="range"
          rangeStart={selection.rangeStart}
          rangeEnd={selection.rangeEnd}
          onDayClick={selection.onDayClick}
        />
      )}
    </div>
  );
}
