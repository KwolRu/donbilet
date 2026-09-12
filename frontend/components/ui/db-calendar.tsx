"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

/**
 * Облегчённый календарь на один месяц.
 *
 * Тот, что был в форме поиска до перехода на двухмесячную панель с ценами:
 * заголовок «Месяц Год» со стрелками и сетка чисел, неделя с понедельника.
 * Панель с ценами осталась в поиске рейсов — там она к месту, а для даты
 * рождения или произвольной даты нужен именно простой выбор.
 *
 * Двойные стрелки листают годы: без них дату рождения пришлось бы отматывать
 * месяцами, а это сотни нажатий.
 */

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const MONTHS = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

export function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/** «04.09.1991» — формат из макета. */
export function formatDateDots(date: Date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}.${month}.${date.getFullYear()}`;
}

/** Сетка месяца, выровненная по понедельнику. `null` — пустая ячейка. */
function buildMonthGrid(year: number, month: number): Array<Date | null> {
  const first = new Date(year, month, 1);
  // getDay(): 0 — воскресенье. Приводим к понедельнику как началу недели.
  const leading = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: Array<Date | null> = Array.from({ length: leading }, () => null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(new Date(year, month, day));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function DbCalendar({
  value,
  onChange,
  /** Раньше этой даты выбор недоступен. */
  min,
  /** Позже этой даты выбор недоступен — для даты рождения это «сегодня». */
  max,
}: {
  value: Date | null;
  onChange: (date: Date) => void;
  min?: Date;
  max?: Date;
}) {
  const [cursor, setCursor] = useState(() => {
    const base = value ?? max ?? new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  // Куда листали последний раз: сетка уезжает в ту же сторону, откуда пришла.
  const [direction, setDirection] = useState<1 | -1>(1);
  const reduced = useReducedMotion();

  const cells = buildMonthGrid(cursor.getFullYear(), cursor.getMonth());

  function shift(months: number) {
    setDirection(months > 0 ? 1 : -1);
    setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + months, 1));
  }

  function unavailable(date: Date) {
    const day = startOfDay(date);
    if (min && day < startOfDay(min)) return true;
    if (max && day > startOfDay(max)) return true;
    return false;
  }

  return (
    <div className="flex w-[318px] flex-col">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <NavButton label="Предыдущий год" onClick={() => shift(-12)}>
            <ChevronsLeft className="size-4 text-db-text-primary" strokeWidth={2} aria-hidden />
          </NavButton>
          <NavButton label="Предыдущий месяц" onClick={() => shift(-1)}>
            <ChevronLeft className="size-4 text-db-text-primary" strokeWidth={2} aria-hidden />
          </NavButton>
        </div>

        <span className="text-db-button font-medium text-db-text-primary">
          {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
        </span>

        <div className="flex items-center gap-1">
          <NavButton label="Следующий месяц" onClick={() => shift(1)}>
            <ChevronRight className="size-4 text-db-text-primary" strokeWidth={2} aria-hidden />
          </NavButton>
          <NavButton label="Следующий год" onClick={() => shift(12)}>
            <ChevronsRight className="size-4 text-db-text-primary" strokeWidth={2} aria-hidden />
          </NavButton>
        </div>
      </div>

      <div className="mb-2 grid grid-cols-7">
        {WEEKDAYS.map((day) => (
          <span key={day} className="text-center text-db-caption text-db-text-secondary">
            {day}
          </span>
        ))}
      </div>

      {/*
       * Сетка перерисовывается целиком, поэтому листание анимируется сменой
       * ключа. `popLayout` держит панель одной высоты — иначе на время
       * перехода в DOM две сетки и календарь прыгает.
       */}
      <div className="overflow-hidden">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.div
            key={`${cursor.getFullYear()}-${cursor.getMonth()}`}
            initial={reduced ? { opacity: 0 } : { opacity: 0, x: direction * 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, x: direction * -20 }}
            transition={{ duration: reduced ? 0 : 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="grid grid-cols-7 gap-y-1"
          >
            {cells.map((date, index) => {
              if (!date) return <span key={index} aria-hidden />;

              const disabled = unavailable(date);
              const selected = value !== null && startOfDay(date).getTime() === startOfDay(value).getTime();

              return (
                <button
                  key={index}
                  type="button"
                  disabled={disabled}
                  onClick={() => onChange(date)}
                  className={
                    "mx-auto flex size-9 items-center justify-center squircle rounded-db-xs text-db-button " +
                    "transition-[background-color,color,transform] duration-200 ease-out " +
                    (selected
                      ? "bg-db-surface-base font-medium text-db-text-primary"
                      : disabled
                        ? "cursor-not-allowed text-db-text-tertiary"
                        : "text-db-text-primary hover:scale-110 hover:bg-db-surface-muted")
                  }
                >
                  {date.getDate()}
                </button>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function NavButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="squircle flex size-7 items-center justify-center rounded-db-xs transition-[background-color,transform] duration-200 ease-out hover:bg-db-surface-muted active:scale-90"
    >
      {children}
    </button>
  );
}
