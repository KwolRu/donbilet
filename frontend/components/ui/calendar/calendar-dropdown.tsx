"use client"

import { useState, useMemo } from "react"
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  CALENDAR_MONTHS,
  CALENDAR_WEEKDAYS,
  getDaysInMonth,
  getFirstDayOfWeek,
  toIsoDate,
  parseIsoDate,
} from "./calendar-utils"

function isSameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  )
}

interface CalendarDropdownContentProps {
  value?: string // "startIso,endIso"
  onChange?: (date: string) => void
  onApply?: (date: string) => void
  onReset?: () => void
  onClose?: () => void
  className?: string
}

type CalendarDropdownProps = {
  label: string
  start: string | null
  end: string | null
  placeholder?: string
  className?: string
  onChange: (start: string | null, end: string | null) => void
}

export function CalendarDropdown({
  label,
  start,
  end,
  placeholder = "Выберите период",
  className = "",
  onChange,
}: CalendarDropdownProps) {
  const [open, setOpen] = useState(false)
  const value = [start ?? "", end ?? ""].join(",")
  const displayValue =
    start && end ? `${formatDateForDisplay(start)} - ${formatDateForDisplay(end)}` : ""

  return (
    <div className={["relative self-stretch", className].join(" ")}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full flex-col items-start justify-center gap-1 overflow-hidden text-left shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)]"
      >
        <span className="text-xs font-normal leading-3 text-text-primary">{label}</span>
        <span className="flex w-full items-center justify-start gap-2 rounded-xl bg-white p-3 outline outline-1 -outline-offset-1 outline-border-subtle">
          <span
            className={[
              "min-w-0 flex-1 truncate text-base font-normal leading-6",
              displayValue ? "text-text-primary" : "text-tint-foreground",
            ].join(" ")}
          >
            {displayValue || placeholder}
          </span>
          <Calendar className="h-6 w-6 shrink-0 text-icon-primary" />
        </span>
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-label="Закрыть календарь"
            className="fixed inset-0 z-[1020] cursor-default"
            onClick={() => setOpen(false)}
          />
          <div
            className="absolute left-0 top-[calc(100%+8px)] z-[1030] w-full rounded-[24px] border border-border-subtle bg-white shadow-[0_16px_40px_rgba(22,28,45,0.12)]"
            style={{ cornerShape: "squircle" } as React.CSSProperties}
          >
            <CalendarDropdownContent
              value={value}
              className="w-full"
              onApply={(next) => {
                const [nextStart, nextEnd] = next.split(",")
                onChange(nextStart || null, nextEnd || null)
                setOpen(false)
              }}
              onReset={() => onChange(null, null)}
              onClose={() => setOpen(false)}
            />
          </div>
        </>
      ) : null}
    </div>
  )
}

function formatDateForDisplay(value: string) {
  const [year, month, day] = value.split("-")
  if (!year || !month || !day) return value
  return `${day}.${month}.${year}`
}

export function CalendarDropdownContent({
  value = "",
  onChange,
  onApply,
  onReset,
  onClose,
  className = "",
}: CalendarDropdownContentProps) {
  const today = useMemo(() => new Date(), [])
  const initialRange = useMemo(() => {
    if (!value) return { start: "", end: "" }
    const [start, end] = value.split(",")
    return { start: start || "", end: end || "" }
  }, [value])

  const [startDate, setStartDate] = useState(initialRange.start)
  const [endDate, setEndDate] = useState(initialRange.end)

  const startParsed = useMemo(() => parseIsoDate(startDate), [startDate])

  const initialView = useMemo(() => {
    if (startParsed)
      return {
        year: startParsed.getFullYear(),
        month: startParsed.getMonth(),
      }
    return { year: today.getFullYear(), month: today.getMonth() }
  }, [startParsed, today])

  const [viewDate, setViewDate] = useState(initialView)

  const viewYear = viewDate.year
  const viewMonth = viewDate.month

  const goPrev = () => {
    if (viewMonth === 0) setViewDate({ year: viewYear - 1, month: 11 })
    else setViewDate({ year: viewYear, month: viewMonth - 1 })
  }

  const goNext = () => {
    if (viewMonth === 11) setViewDate({ year: viewYear + 1, month: 0 })
    else setViewDate({ year: viewYear, month: viewMonth + 1 })
  }

  const secondMonth = viewMonth === 11 ? 0 : viewMonth + 1
  const secondYear = viewMonth === 11 ? viewYear + 1 : viewYear

  const handleDayClick = (year: number, month: number, day: number) => {
    const iso = toIsoDate(year, month, day)
    const clicked = parseIsoDate(iso)
    if (!clicked) return

    const start = parseIsoDate(startDate)
    const end = parseIsoDate(endDate)

    if (!startDate || (start && end && !isSameDay(clicked, start) && !isSameDay(clicked, end))) {
      setStartDate(iso)
      setEndDate("")
    } else if (start && !end) {
      if (clicked >= start) {
        setEndDate(iso)
      } else {
        setStartDate(iso)
        setEndDate("")
      }
    } else if (start && end) {
      if (isSameDay(clicked, start) || isSameDay(clicked, end)) {
        setStartDate(iso)
        setEndDate("")
      } else if (clicked > start && clicked < end) {
        setStartDate(iso)
        setEndDate("")
      } else if (clicked < start) {
        setStartDate(iso)
        setEndDate("")
      } else {
        setEndDate(iso)
      }
    }
  }

  const handleReset = () => {
    setStartDate("")
    setEndDate("")
    onReset?.()
  }

  const handleApply = () => {
    const result = `${startDate},${endDate}`
    onChange?.(result)
    onApply?.(result)
    onClose?.()
  }

  const getDayRangeState = (year: number, month: number, day: number) => {
    const iso = toIsoDate(year, month, day)
    const date = parseIsoDate(iso)
    if (!date) return { isStart: false, isEnd: false, isMid: false, hasRange: false }

    const start = parseIsoDate(startDate)
    const end = parseIsoDate(endDate)

    return {
      isStart: Boolean(start && isSameDay(date, start)),
      isEnd: Boolean(end && isSameDay(date, end)),
      isMid: Boolean(start && end && date > start && date < end),
      hasRange: Boolean(start && end),
    }
  }

  const renderMonth = (year: number, month: number) => {
    const days = getDaysInMonth(year, month)
    const firstDay = getFirstDayOfWeek(year, month)

    return (
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-center justify-between">
          {month === viewMonth ? (
            <button
              type="button"
              onClick={goPrev}
              className="w-4 h-4 flex items-center justify-center text-text-primary hover:text-text-link-hover transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
          ) : (
            <div className="w-4 h-4" />
          )}
          <span className="text-text-primary text-sm font-light leading-4">
            {CALENDAR_MONTHS[month]} {year}
          </span>
          {month === secondMonth ? (
            <button
              type="button"
              onClick={goNext}
              className="w-4 h-4 flex items-center justify-center text-text-primary hover:text-text-link-hover transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          ) : (
            <div className="w-4 h-4" />
          )}
        </div>

        <div className="grid grid-cols-7 gap-0.5">
          {CALENDAR_WEEKDAYS.map((d: string) => (
            <div
              key={d}
              className="flex h-6 min-w-0 items-center justify-center text-sm font-light text-text-tertiary"
            >
              {d}
            </div>
          ))}
        </div>

        <div className="flex flex-col">
          {Array.from({
            length: Math.ceil((firstDay + days) / 7),
          }).map((_, week) => (
            <div key={week} className="grid grid-cols-7">
              {Array.from({ length: 7 }).map((__, dow) => {
                const cell = week * 7 + dow
                const day = cell - firstDay + 1
                const inMonth = day >= 1 && day <= days
                const rangeState = inMonth ? getDayRangeState(year, month, day) : null

                if (!inMonth) {
                  return (
                    <div
                      key={dow}
                      className="flex h-6 min-w-0 items-center justify-center"
                    >
                      <span className="opacity-0 text-sm">0</span>
                    </div>
                  )
                }

                return (
                  <button
                    key={dow}
                    type="button"
                    onClick={() => handleDayClick(year, month, day)}
                    className="relative flex h-6 min-w-0 items-center justify-center text-sm font-light leading-4 transition-colors"
                    style={{ cornerShape: "squircle" } as React.CSSProperties}

                  >
                    {rangeState?.hasRange && (rangeState.isStart || rangeState.isEnd || rangeState.isMid) ? (
                      <span
                        className={[
                          "absolute inset-y-0 bg-bg-surface-base-elevated",
                          rangeState.isMid ? "left-0 right-0" : "",
                          rangeState.isStart ? "left-1/2 right-0" : "",
                          rangeState.isEnd ? "left-0 right-1/2" : "",
                        ].join(" ")}
                      />
                    ) : null}
                    <span
                      className={[
                        "relative z-10 flex h-6 w-full items-center justify-center transition-colors",
                        rangeState?.isStart || rangeState?.isEnd
                          ? "rounded-[16px] bg-bg-surface-base-base text-text-inverse"
                          : "rounded-[16px] text-text-primary hover:bg-bg-surface-base-elevated",
                      ].join(" ")}
                      style={{ cornerShape: "squircle" } as React.CSSProperties}
                    >
                      {day}
                    </span>
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={`flex flex-col gap-3 p-3 ${className}`}>
      <div className="flex w-full gap-3">
        {renderMonth(viewYear, viewMonth)}
        {renderMonth(secondYear, secondMonth)}
      </div>

      <div className="pt-3 border-t border-border-subtle flex gap-3">
        <Button
          variant="linear"
          size="small"
          className="flex-1"
          onClick={handleReset}
        >
          Сбросить
        </Button>
        <Button
          variant="secondary"
          size="small"
          className="flex-1"
          disabled={!startDate || !endDate}
          onClick={handleApply}
        >
          Применить
        </Button>
      </div>
    </div>
  )
}
