"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { DbButton } from "@/components/ui/db-button";
import { usePopover } from "@app/core/hooks/use-popover";
import { DbPopoverPanel } from "@/components/ui/db-popover";

/**
 * Поле даты с календарём на два месяца.
 *
 * По макету: панель 768px, два месяца рядом, в ячейке под числом — цена дня,
 * снизу минимальная цена и кнопки «Сбросить» / «Выбрать». Неделя начинается с
 * понедельника, прошедшие даты недоступны — билет на вчера не купить.
 *
 * Выбор применяется только по кнопке «Выбрать»: в макете внизу панели есть
 * подтверждение, а значит клик по числу — это черновик, а не финальный ответ.
 */

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const MONTHS = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];
const MONTHS_SHORT = [
  "янв", "фев", "мар", "апр", "мая", "июн",
  "июл", "авг", "сен", "окт", "ноя", "дек",
];
const WEEKDAYS_SHORT = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function sameDay(a: Date, b: Date) {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

/** «17 сен, чт» — формат из макета. */
export function formatTripDate(date: Date) {
  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}, ${WEEKDAYS_SHORT[date.getDay()]}`;
}

/**
 * Цена дня — мок до появления рабочего API (блокер B1).
 *
 * Считается детерминированно из самой даты: иначе цены менялись бы при каждой
 * перерисовке, и календарь «мигал» бы числами. Когда появится API, эта функция
 * заменяется ответом календаря цен — разметка не меняется.
 */
function priceFor(date: Date): number {
  const key = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
  const noise = Math.abs(Math.sin(key) * 10000) % 1;
  return Math.round((1800 + noise * 4200) / 5) * 5;
}

function formatPrice(value: number) {
  return value.toLocaleString("ru-RU");
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

export function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Date;
  onChange: (date: Date) => void;
}) {
  const { open, setOpen, ref } = usePopover();
  const [cursor, setCursor] = useState(() => new Date(value.getFullYear(), value.getMonth(), 1));
  const [draft, setDraft] = useState(value);
  // Куда листали последний раз: сетка уезжает в ту же сторону, откуда пришла.
  const [direction, setDirection] = useState<1 | -1>(1);
  const reduced = useReducedMotion();

  const today = startOfDay(new Date());

  /**
   * Открыли панель — показываем то, что выбрано сейчас, а не прошлый черновик.
   * Сброс делается в обработчике, а не в эффекте: эффект здесь вызвал бы лишний
   * каскад перерисовок сразу после открытия.
   */
  function toggle() {
    if (!open) {
      setDraft(value);
      setCursor(new Date(value.getFullYear(), value.getMonth(), 1));
    }
    setOpen(!open);
  }

  const months = useMemo(
    () =>
      [0, 1].map((offset) => {
        const month = new Date(cursor.getFullYear(), cursor.getMonth() + offset, 1);
        return { month, cells: buildMonthGrid(month.getFullYear(), month.getMonth()) };
      }),
    [cursor],
  );

  // Минимальная цена по двум показанным месяцам — она же в подписи слева внизу.
  const minPrice = useMemo(() => {
    const prices = months
      .flatMap(({ cells }) => cells)
      .filter((date): date is Date => date !== null && startOfDay(date) >= today)
      .map(priceFor);
    return prices.length ? Math.min(...prices) : 0;
  }, [months, today]);

  function shiftMonth(step: 1 | -1) {
    setDirection(step);
    setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + step, 1));
  }

  return (
    <div ref={ref} className="relative flex flex-1 flex-col">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className={
          "flex flex-col items-start gap-0.5 squircle rounded-db-sm px-3 py-1 text-left " +
          "transition-colors duration-300 ease-out hover:bg-db-surface-muted " +
          (open ? "bg-db-surface-muted" : "")
        }
      >
        <span className="text-db-micro text-db-text-secondary">{label}</span>
        <span className="text-db-field font-semibold text-db-text-primary">
          {formatTripDate(value)}
        </span>
      </button>

      <DbPopoverPanel
        open={open}
        className="absolute top-full left-0 z-20 mt-3 flex w-[768px] flex-col gap-2 squircle rounded-db-md bg-db-surface-default pt-4 shadow-[0_0_36px_rgba(0,0,0,0.12)]"
      >
        {/* Шапка: стрелка и название месяца у каждой половины. */}
        <div className="flex items-start">
          <div className="flex flex-1 items-center justify-between pr-12 pl-4">
            <button
              type="button"
              aria-label="Предыдущий месяц"
              onClick={() => shiftMonth(-1)}
              className="squircle flex items-center justify-center rounded-db-sm p-3 transition-colors duration-300 ease-out hover:bg-db-surface-muted"
            >
              <ChevronLeft className="size-4 text-db-text-primary" strokeWidth={1.5} aria-hidden />
            </button>
            <span className="flex-1 text-center text-[18px] leading-6 font-medium text-db-text-primary">
              {MONTHS[months[0].month.getMonth()]}
            </span>
          </div>

          <div className="flex flex-1 items-center justify-between pr-4 pl-12">
            <span className="flex-1 text-center text-[18px] leading-6 font-medium text-db-text-primary">
              {MONTHS[months[1].month.getMonth()]}
            </span>
            <button
              type="button"
              aria-label="Следующий месяц"
              onClick={() => shiftMonth(1)}
              className="squircle flex items-center justify-center rounded-db-sm p-3 transition-colors duration-300 ease-out hover:bg-db-surface-muted"
            >
              <ChevronRight className="size-4 text-db-text-primary" strokeWidth={1.5} aria-hidden />
            </button>
          </div>
        </div>

        {/*
         * Обе сетки перерисовываются целиком, поэтому листание анимируется
         * сменой ключа: старая пара месяцев уезжает в сторону, новая приходит
         * с противоположной. `mode="popLayout"` держит панель одной высоты —
         * без него на время перехода в DOM две сетки и календарь «прыгает».
         */}
        <div className="overflow-hidden">
          <AnimatePresence initial={false} mode="popLayout" custom={direction}>
            <motion.div
              key={`${cursor.getFullYear()}-${cursor.getMonth()}`}
              custom={direction}
              initial={reduced ? { opacity: 0 } : { opacity: 0, x: direction * 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, x: direction * -24 }}
              transition={{ duration: reduced ? 0 : 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="flex w-full items-start justify-between"
            >
              {months.map(({ month, cells }, monthIndex) => (
                <div
                  key={`${month.getFullYear()}-${month.getMonth()}`}
                  className={
                    "flex flex-col " + (monthIndex === 0 ? "pr-2 pl-3" : "pr-3 pl-2")
                  }
                >
                  <div className="flex">
                    {WEEKDAYS.map((day) => (
                      <span
                        key={day}
                        className="w-12 text-center text-[12px] leading-4 text-db-text-tertiary"
                      >
                        {day}
                      </span>
                    ))}
                  </div>

                  <div className="grid grid-cols-7">
                    {cells.map((date, index) => {
                      if (!date) return <span key={index} className="w-12" aria-hidden />;

                      const past = startOfDay(date) < today;
                      const selected = sameDay(date, draft);
                      const price = priceFor(date);
                      // Зелёным — самые выгодные дни: так их видно, не читая все цены.
                      const cheap = !past && price <= minPrice * 1.05;

                      return (
                        <button
                          key={index}
                          type="button"
                          disabled={past}
                          onClick={() => setDraft(date)}
                          className={
                            "flex w-12 flex-col items-center justify-center gap-1 squircle rounded-db-sm px-1 py-3 " +
                            "transition-colors duration-300 ease-out " +
                            (selected
                              ? "bg-db-surface-base"
                              : past
                                ? "cursor-not-allowed"
                                : "hover:bg-db-surface-muted")
                          }
                        >
                          <span
                            className={
                              "text-center text-[16px] leading-4 " +
                              (past ? "text-db-text-tertiary" : "text-db-text-primary")
                            }
                          >
                            {date.getDate()}
                          </span>
                          <span
                            className={
                              "text-center text-[8px] leading-[8.16px] " +
                              (past
                                ? "text-db-text-tertiary"
                                : selected
                                  ? "text-db-text-primary"
                                  : cheap
                                    ? "text-[#189d57]"
                                    : "text-db-text-secondary")
                            }
                          >
                            {formatPrice(price)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-between px-4 pb-4">
          <span className="text-[18px] leading-6 font-medium text-db-text-primary">
            от {formatPrice(minPrice)}
          </span>

          <div className="flex items-center gap-3">
            <DbButton
              variant="ghost"
              size="small"
              onClick={() => {
                setDraft(today);
                setCursor(new Date(today.getFullYear(), today.getMonth(), 1));
              }}
            >
              Сбросить
            </DbButton>
            <DbButton
              variant="primary"
              size="small"
              onClick={() => {
                onChange(draft);
                setOpen(false);
              }}
            >
              Выбрать
            </DbButton>
          </div>
        </div>
      </DbPopoverPanel>
    </div>
  );
}
