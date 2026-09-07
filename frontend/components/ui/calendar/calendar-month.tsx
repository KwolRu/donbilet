"use client";

import {
  CALENDAR_WEEKDAYS,
  getDaysInMonth,
  getFirstDayOfWeek,
  toIsoDate,
} from "./calendar-utils";

type SingleSelectionProps = {
  mode: "single";
  selectedDate?: string | null;
  onDayClick: (isoDate: string) => void;
};

type RangeSelectionProps = {
  mode: "range";
  rangeStart?: string;
  rangeEnd?: string;
  onDayClick: (isoDate: string) => void;
};

type Props = {
  year: number;
  month: number;
  className?: string;
} & (SingleSelectionProps | RangeSelectionProps);

function inRange(value: string, start?: string, end?: string) {
  if (!start || !end) return false;
  return value >= start && value <= end;
}

export function CalendarMonth({ year, month, className = "", ...selection }: Props) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDayOfWeek = getFirstDayOfWeek(year, month);

  const parsedSelected =
    selection.mode === "single" && selection.selectedDate
      ? selection.selectedDate.match(/^(\d{4})-(\d{2})-(\d{2})$/)
      : null;
  const selectedDay =
    parsedSelected &&
    Number(parsedSelected[1]) === year &&
    Number(parsedSelected[2]) === month + 1
      ? Number(parsedSelected[3])
      : null;

  return (
    <div className={className}>
      <div className="mb-2 grid grid-cols-7">
        {CALENDAR_WEEKDAYS.map((weekday) => (
          <span key={weekday} className="text-center text-input-lg text-text-tertiary">
            {weekday}
          </span>
        ))}
      </div>

      <div className={selection.mode === "range" ? "grid grid-cols-7" : "grid grid-cols-7 gap-y-1"}>
        {Array.from({ length: firstDayOfWeek }).map((_, index) => (
          <span key={`empty-${index}`} />
        ))}

        {Array.from({ length: daysInMonth }, (_, index) => index + 1).map((day) => {
          const isoDate = toIsoDate(year, month, day);

          if (selection.mode === "single") {
            const isSelected = day === selectedDay;

            return (
              <button
                key={day}
                type="button"
                onClick={() => selection.onDayClick(isoDate)}
                className="relative h-8 w-full overflow-visible"
              >
                <span
                  className={[
                    "relative z-10 mx-auto flex h-8 w-8 items-center justify-center rounded-[8px] text-input-lg transition-colors",
                    isSelected
                      ? "bg-[var(--color-text-link-hover)] text-text-button-primary-normal"
                      : "text-text-primary hover:bg-bg-surface-base-tertiary",
                  ].join(" ")}
                >
                  {day}
                </span>
              </button>
            );
          }

          const isStart = selection.rangeStart === isoDate;
          const isEnd = selection.rangeEnd === isoDate;
          const isMid = inRange(isoDate, selection.rangeStart, selection.rangeEnd) && !isStart && !isEnd;

          return (
            <button
              key={day}
              type="button"
              onClick={() => selection.onDayClick(isoDate)}
              className="relative h-8 w-full overflow-visible"
            >
              {(isMid || isStart || isEnd) && selection.rangeStart && selection.rangeEnd ? (
                <span
                  className={[
                    "absolute top-0 h-8 bg-bg-surface-base-elevated",
                    isMid ? "left-0 right-0" : "",
                    isStart ? "left-[calc(50%-1px)] right-0" : "",
                    isEnd ? "left-0 right-[calc(50%-1px)]" : "",
                  ].join(" ")}
                />
              ) : null}
              <span
                className={[
                  "relative z-10 mx-auto flex h-8 w-8 items-center justify-center rounded-[8px] text-input-lg transition-colors",
                  isStart || isEnd
                    ? "bg-[var(--color-text-link-hover)] text-text-button-primary-normal"
                    : "text-text-primary hover:bg-bg-surface-base-tertiary",
                ].join(" ")}
              >
                {day}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
