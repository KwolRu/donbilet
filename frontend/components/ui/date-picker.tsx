"use client"

import {
  CSSProperties,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react"

const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect
import { createPortal } from "react-dom"
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CalendarPickerSelect } from "@/components/ui/calendar/calendar-picker-select"

type DatePickerProps = {
  value: string
  onChange: (date: string) => void
  error?: string
  label: string
  /** Скрыть визуальную подпись (остаётся только aria-label) — когда подпись уже есть рядом. */
  hideLabel?: boolean
  required?: boolean
  allowManualInput?: boolean
  manualDisplayValue?: string
  onManualInputChange?: (value: string) => void
  onManualInputBlur?: () => void
  placeholder?: string
  calendarClassName?: string
  /** Фиксированная ширина выпадающего календаря в px или CSS-значении. */
  calendarWidth?: number | string
  /** Подогнать ширину выпадающего календаря под ширину инпута-триггера. */
  fitToTriggerWidth?: boolean
  inputClassName?: string
  className?: string
  disabled?: boolean
  /** Открыть календарь сразу после монтирования интерактивного поля. */
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  /** Рендерить календарь через createPortal (fixed) или inline под инпутом. */
  portal?: boolean
}

const MONTHS = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
]

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]
const YEAR_RANGE = 120
const VIEWPORT_MARGIN = 12
// Размеры до первого измерения реального меню.
const FALLBACK_MENU_HEIGHT = 380
const FALLBACK_MENU_WIDTH = 320
const subscribeToClient = () => () => undefined
const getClientSnapshot = () => true
const getServerSnapshot = () => false

type DateSelectOption = {
  label: string
  value: string
}

function formatDisplay(dateStr: string): string {
  if (!dateStr) return ""

  const [year, month, day] = dateStr.split("-")
  if (!year || !month || !day) return ""

  return `${day}.${month}.${year}`
}

function parseIsoDate(value: string) {
  if (!value) return null

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2]) - 1
  const day = Number(match[3])
  const date = new Date(year, month, day)

  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
    return null
  }

  return date
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfWeek(year: number, month: number) {
  const day = new Date(year, month, 1).getDay()
  return day === 0 ? 6 : day - 1
}

function toIsoDate(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

export function DatePicker({
  value,
  onChange,
  error,
  label,
  hideLabel = false,
  required,
  allowManualInput = false,
  manualDisplayValue,
  onManualInputChange,
  onManualInputBlur,
  placeholder = "ДД.ММ.ГГГГ",
  calendarClassName,
  calendarWidth,
  fitToTriggerWidth = false,
  className,
  disabled = false,
  defaultOpen = false,
  onOpenChange,
  portal = true,
}: DatePickerProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(defaultOpen)
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({})
  const isCalendarClickRef = useRef(false)

  const changeOpen = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen)
      onOpenChange?.(nextOpen)
    },
    [onOpenChange],
  )

  const displayValue = allowManualInput ? (manualDisplayValue ?? "") : formatDisplay(value)

  const updateMenuPosition = useCallback(() => {
    if (!triggerRef.current) return
    const triggerRect = triggerRef.current.getBoundingClientRect()
    const viewportHeight = window.innerHeight
    const viewportWidth = window.innerWidth
    const menuRect = menuRef.current?.getBoundingClientRect()

    const menuHeight = menuRect?.height || FALLBACK_MENU_HEIGHT
    const spaceBelow = viewportHeight - triggerRect.bottom - VIEWPORT_MARGIN
    const spaceAbove = triggerRect.top - VIEWPORT_MARGIN
    const openUpwards = spaceBelow < menuHeight && spaceAbove > spaceBelow

    const width = calendarWidth ?? (fitToTriggerWidth ? triggerRect.width : undefined)
    const menuWidth =
      (typeof width === "number" ? width : menuRect?.width) || FALLBACK_MENU_WIDTH
    // Не даём календарю уехать за правый/левый край окна.
    const maxLeft = Math.max(VIEWPORT_MARGIN, viewportWidth - menuWidth - VIEWPORT_MARGIN)
    const left = Math.min(Math.max(triggerRect.left, VIEWPORT_MARGIN), maxLeft)

    setMenuStyle({
      position: "fixed",
      left,
      top: openUpwards ? undefined : triggerRect.bottom + 8,
      bottom: openUpwards ? viewportHeight - triggerRect.top + 8 : undefined,
      maxHeight: viewportHeight - 2 * VIEWPORT_MARGIN,
      width,
      zIndex: 9999,
    })
  }, [calendarWidth, fitToTriggerWidth])

  const closeOnOutsideClick = useCallback((event: MouseEvent) => {
    const target = event.target as Node
    const targetElement = target instanceof Element ? target : target.parentElement
    if (targetElement?.closest('[data-ui-select-menu="true"]')) {
      isCalendarClickRef.current = true
      return
    }
    if (menuRef.current?.contains(target)) return
    if (!rootRef.current?.contains(target)) {
      changeOpen(false)
    }
  }, [changeOpen])

  useIsomorphicLayoutEffect(() => {
    if (!open) return undefined

    document.addEventListener("mousedown", closeOnOutsideClick)
    updateMenuPosition()

    let lastLeft = -1
    let lastTop = -1
    let lastWidth = -1
    let lastHeight = -1
    let rafId: number

    const tick = () => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect()
        if (
          rect.left !== lastLeft ||
          rect.top !== lastTop ||
          rect.width !== lastWidth ||
          rect.height !== lastHeight
        ) {
          lastLeft = rect.left
          lastTop = rect.top
          lastWidth = rect.width
          lastHeight = rect.height
          updateMenuPosition()
        }
      }
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)

    const handleViewportChange = () => updateMenuPosition()
    window.addEventListener("resize", handleViewportChange)
    window.addEventListener("scroll", handleViewportChange, true)
    return () => {
      cancelAnimationFrame(rafId)
      document.removeEventListener("mousedown", closeOnOutsideClick)
      window.removeEventListener("resize", handleViewportChange)
      window.removeEventListener("scroll", handleViewportChange, true)
    }
  }, [closeOnOutsideClick, open, updateMenuPosition])

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return
    if (allowManualInput) {
      onManualInputChange?.(event.target.value)
      return
    }
  }

  const handleInputBlur = () => {
    if (disabled) return
    if (isCalendarClickRef.current) {
      isCalendarClickRef.current = false
      return
    }
    if (allowManualInput) {
      onManualInputBlur?.()
    }
  }

  return (
    <div ref={rootRef} className={`relative ${className ?? "w-full"}`}>
      <label className="flex w-full flex-col gap-1">
        {hideLabel ? null : (
          <span className="text-caption-sm text-text-primary">
            {label}
            {required ? <span className="text-error"> *</span> : null}
          </span>
        )}

        <div className="relative">
          <input
            ref={triggerRef}
            type="text"
            value={displayValue}
            onChange={handleInputChange}
            onClick={() => {
              if (!disabled) changeOpen(true)
            }}
            onFocus={() => {
              if (!disabled && !allowManualInput) {
                changeOpen(true)
              }
            }}
            onBlur={handleInputBlur}
            disabled={disabled}
            autoFocus={defaultOpen}
            readOnly={!allowManualInput}
            placeholder={placeholder}
            aria-label={hideLabel ? label : undefined}
            aria-invalid={!!error}
            className={[
              "h-12 w-full  border border-border-subtle bg-surface p-3 pr-11 text-input-lg outline-none transition-colors",
              "placeholder:text-tint-foreground rounded-[24px]",
              error
                ? "border-error text-error focus:border-error"
                : disabled
                  ? "cursor-not-allowed border-subtle text-text-tertiary"
                  : open
                    ? "border-[var(--color-text-link-hover)]! text-text-primary"
                    : "border-subtle text-text-primary focus:border-[var(--color-text-link-hover)]!",
              "rounded-[24px]",
            ].join(" ")}
            style={{ cornerShape: "squircle" } as CSSProperties}
          />

          <Button
            variant="ghost"
            size="icon-small"
            className="absolute right-3 top-1/2 -translate-y-1/2"
            onMouseDown={() => {
              isCalendarClickRef.current = true
            }}
            onClick={() => changeOpen(!open)}
            disabled={disabled}
            aria-label="Открыть календарь"
            iconLeft={<Calendar className="h-5 w-5" />}
          />
        </div>

        {error ? <span className="text-[12px] font-light text-error">{error}</span> : null}
      </label>

      {open &&
        (portal ? (
          createPortal(
            <div
              ref={menuRef}
              onMouseDownCapture={() => {
                isCalendarClickRef.current = true
              }}
              style={
                {
                  position: "fixed",
                  top: -9999,
                  left: -9999,
                  opacity: menuStyle.left !== undefined ? 1 : 0,
                  pointerEvents: menuStyle.left !== undefined ? "auto" : "none",
                  ...menuStyle,
                  cornerShape: "squircle",
                } as React.CSSProperties
              }
            >
              <CalendarPanel
                value={value}
                onChange={(next) => {
                  onChange(next)
                  changeOpen(false)
                }}
                className={
                  calendarClassName ?? (calendarWidth || fitToTriggerWidth ? "w-full" : undefined)
                }
              />
            </div>,
            document.body,
          )
        ) : (
          <div
            ref={menuRef}
            onMouseDownCapture={() => {
              isCalendarClickRef.current = true
            }}
            className="mt-2"
          >
            <CalendarPanel
              value={value}
              onChange={(next) => {
                onChange(next)
                changeOpen(false)
              }}
              className={
                calendarClassName ?? (calendarWidth || fitToTriggerWidth ? "w-full" : undefined)
              }
            />
          </div>
        ))}
    </div>
  )
}

type CalendarPanelProps = {
  value: string
  onChange: (date: string) => void
  className?: string
}

export function CalendarPanel({ value, onChange, className }: CalendarPanelProps) {
  const today = useMemo(() => new Date(), [])
  const parsedValue = useMemo(() => parseIsoDate(value), [value])

  const [viewDate, setViewDate] = useState(() => ({
    year: parsedValue?.getFullYear() ?? today.getFullYear(),
    month: parsedValue?.getMonth() ?? today.getMonth(),
  }))

  const viewYear = viewDate.year
  const viewMonth = viewDate.month

  const yearOptions = useMemo(() => {
    const selectedYear = parsedValue?.getFullYear() ?? today.getFullYear()
    const end = Math.max(today.getFullYear(), selectedYear) + 1
    const start = end - YEAR_RANGE
    return Array.from({ length: end - start + 1 }, (_, index) => end - index)
  }, [parsedValue, today])

  const monthOptions = useMemo<DateSelectOption[]>(
    () => MONTHS.map((month, index) => ({ label: month, value: String(index) })),
    [],
  )

  const yearSelectOptions = useMemo<DateSelectOption[]>(
    () => yearOptions.map((year) => ({ label: String(year), value: String(year) })),
    [yearOptions],
  )

  const goToPreviousMonth = () => {
    if (viewMonth === 0) {
      setViewDate({ year: viewYear - 1, month: 11 })
      return
    }
    setViewDate({ year: viewYear, month: viewMonth - 1 })
  }

  const goToNextMonth = () => {
    if (viewMonth === 11) {
      setViewDate({ year: viewYear + 1, month: 0 })
      return
    }
    setViewDate({ year: viewYear, month: viewMonth + 1 })
  }

  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const firstDayOfWeek = getFirstDayOfWeek(viewYear, viewMonth)
  const selectedDay =
    parsedValue && parsedValue.getFullYear() === viewYear && parsedValue.getMonth() === viewMonth
      ? parsedValue.getDate()
      : null

  const handleSelectDay = (day: number) => {
    onChange(toIsoDate(viewYear, viewMonth, day))
  }

  return (
    <div
      data-testid="date-picker-calendar"
      className={`rounded-[24px] border border-[var(--color-text-link-hover)] bg-white p-3 ${className ?? "w-96"}`}
      style={{ cornerShape: "squircle" } as React.CSSProperties}
    >
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon-small"
          className="h-10 w-10 shrink-0 rounded-[24px] bg-bg-button-ghost-normal p-3"
          onClick={goToPreviousMonth}
          aria-label="Предыдущий месяц"
          iconLeft={<ChevronLeft className="size-4 stroke-[1.5]" />}
        />

        <div className="flex flex-1 items-center gap-3">
          <CalendarPickerSelect
            widthClassName="flex-1"
            placeholder="Месяц"
            value={String(viewMonth)}
            options={monthOptions}
            onChange={(nextValue) => {
              const nextMonth = Number(nextValue)
              if (!Number.isInteger(nextMonth) || nextMonth < 0 || nextMonth > 11) return
              setViewDate((current) => ({ ...current, month: nextMonth }))
            }}
          />

          <CalendarPickerSelect
            widthClassName="flex-1"
            placeholder="Год"
            value={String(viewYear)}
            options={yearSelectOptions}
            onChange={(nextValue) => {
              const nextYear = Number(nextValue)
              if (!Number.isInteger(nextYear)) return
              setViewDate((current) => ({ ...current, year: nextYear }))
            }}
          />
        </div>

        <Button
          variant="ghost"
          size="icon-small"
          className="h-10 w-10 shrink-0 rounded-[24px] bg-bg-button-ghost-normal p-3"
          onClick={goToNextMonth}
          aria-label="Следующий месяц"
          iconLeft={<ChevronRight className="size-4 stroke-[1.5]" />}
          style={{ cornerShape: "squircle" } as React.CSSProperties}
        />
      </div>

      <div className="mt-2 flex items-start justify-between">
        {WEEKDAYS.map((weekday) => (
          <div
            key={weekday}
            className="w-8 text-center text-text-tertiary text-[16px] font-normal leading-[24px]"
          >
            {weekday}
          </div>
        ))}
      </div>

      <div className="mt-2 flex flex-col gap-1">
        {Array.from({ length: Math.ceil((firstDayOfWeek + daysInMonth) / 7) }).map(
          (_, weekIndex) => (
            <div key={weekIndex} className="flex items-start justify-between">
              {Array.from({ length: 7 }).map((__, dayOfWeek) => {
                const cellIndex = weekIndex * 7 + dayOfWeek
                const day = cellIndex - firstDayOfWeek + 1
                const isInMonth = day >= 1 && day <= daysInMonth
                const isSelected = isInMonth && day === selectedDay

                if (!isInMonth) {
                  return (
                    <div
                      key={dayOfWeek}
                      className="flex items-center justify-center rounded-[16px] p-1"
                      style={{ cornerShape: "squircle" } as React.CSSProperties}
                    >
                      <span className="block w-6 text-center text-[16px] leading-[24px] opacity-0">
                        22
                      </span>
                    </div>
                  )
                }

                return (
                  <button
                    key={dayOfWeek}
                    type="button"
                    onClick={() => handleSelectDay(day)}
                    className={[
                      "flex items-center justify-center rounded-[16px] p-1 transition-colors",
                      isSelected
                        ? "bg-[var(--color-text-link-hover)] text-text-inverse"
                        : "text-text-primary hover:bg-bg-surface-base-tertiary",
                    ].join(" ")}
                    style={{ cornerShape: "squircle" } as React.CSSProperties}
                  >
                    <span className="block w-6 text-center text-[16px] font-normal leading-[24px]">
                      {day}
                    </span>
                  </button>
                )
              })}
            </div>
          ),
        )}
      </div>
    </div>
  )
}

type DatePickerModalProps = {
  open: boolean
  value: string
  onChange: (date: string) => void
  onClose: () => void
  calendarClassName?: string
}

export function DatePickerModal({
  open,
  value,
  onChange,
  onClose,
  calendarClassName,
}: DatePickerModalProps) {
  const mounted = useSyncExternalStore(
    subscribeToClient,
    getClientSnapshot,
    getServerSnapshot,
  )

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!mounted || !open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()}>
        <CalendarPanel
          value={value}
          onChange={(next) => {
            onChange(next)
            onClose()
          }}
          className={calendarClassName}
        />
      </div>
    </div>,
    document.body,
  )
}
