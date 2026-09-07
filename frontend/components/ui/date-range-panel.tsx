"use client";

import { ChevronLeft } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarPanel } from "@/components/ui/calendar";

type Props = {
  title: string;
  initialStart?: string;
  initialEnd?: string;
  onBack: () => void;
  onSelectionChange?: (start?: string, end?: string) => void;
  hideHeader?: boolean;
};

export function DateRangePanel({
  title,
  initialStart,
  initialEnd,
  onBack,
  onSelectionChange,
  hideHeader = false,
}: Props) {
  // «Сегодня» фиксируем один раз за жизнь панели: новый Date() на каждый рендер
  // менял бы зависимости useMemo и пересчитывал сетку месяцев без причины.
  const [now] = useState(() => new Date());
  const [firstMonthOffset, setFirstMonthOffset] = useState(0);
  const [secondMonthOffset, setSecondMonthOffset] = useState(1);
  const [start, setStart] = useState<string | undefined>(initialStart);
  const [end, setEnd] = useState<string | undefined>(initialEnd);
  const onSelectionChangeRef = useRef(onSelectionChange);

  const firstMonthDate = useMemo(() => {
    return new Date(now.getFullYear(), now.getMonth() + firstMonthOffset, 1);
  }, [now, firstMonthOffset]);

  const secondMonthDate = useMemo(() => {
    return new Date(now.getFullYear(), now.getMonth() + secondMonthOffset, 1);
  }, [now, secondMonthOffset]);

  useEffect(() => {
    onSelectionChangeRef.current = onSelectionChange;
  }, [onSelectionChange]);

  // Синхронизация с внешним диапазоном во время рендера: эффект здесь давал бы
  // лишний кадр со старыми датами при программной смене периода.
  const [prevInitial, setPrevInitial] = useState({ start: initialStart, end: initialEnd });
  if (prevInitial.start !== initialStart || prevInitial.end !== initialEnd) {
    setPrevInitial({ start: initialStart, end: initialEnd });
    setStart(initialStart);
    setEnd(initialEnd);
  }

  useEffect(() => {
    onSelectionChangeRef.current?.(start, end);
  }, [start, end]);

  const handlePick = (value: string) => {
    if (!start || (start && end)) {
      setStart(value);
      setEnd(undefined);
      return;
    }
    if (value < start) {
      setEnd(start);
      setStart(value);
      return;
    }
    setEnd(value);
  };

  return (
    <div>
      {!hideHeader ? (
        <div className="mb-5 flex items-center gap-2">
          <button type="button" onClick={onBack} className="text-text-primary">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h3 className="text-h2 text-text-primary">{title}</h3>
        </div>
      ) : null}

      <CalendarPanel
        variant="simple"
        className="mb-6"
        viewYear={firstMonthDate.getFullYear()}
        viewMonth={firstMonthDate.getMonth()}
        onViewChange={({ year, month }) => {
          const next = new Date(year, month, 1);
          const diff =
            (next.getFullYear() - now.getFullYear()) * 12 + (next.getMonth() - now.getMonth());
          setFirstMonthOffset(diff);
          setSecondMonthOffset(diff + 1);
        }}
        mode="range"
        rangeStart={start}
        rangeEnd={end}
        onDayClick={handlePick}
        today={now}
      />
      <CalendarPanel
        variant="simple"
        viewYear={secondMonthDate.getFullYear()}
        viewMonth={secondMonthDate.getMonth()}
        onViewChange={({ year, month }) => {
          const next = new Date(year, month, 1);
          const diff =
            (next.getFullYear() - now.getFullYear()) * 12 + (next.getMonth() - now.getMonth());
          setSecondMonthOffset(diff);
          setFirstMonthOffset(diff - 1);
        }}
        mode="range"
        rangeStart={start}
        rangeEnd={end}
        onDayClick={handlePick}
        today={now}
      />
    </div>
  );
}
