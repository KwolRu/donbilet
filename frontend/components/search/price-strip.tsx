"use client";

import { useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Search } from "lucide-react";

import { DbStripArrow } from "@/components/ui/db-strip-arrow";

import { PRICE_COLUMNS, type PriceColumn } from "@app/core/mocks/search";

/**
 * Календарь цен над выдачей: соседние даты и сколько на них стоит поездка.
 *
 * Столбец без цены — не пустой, а «не считали»: в макете там лупа, и нажатие
 * запускает поиск на эту дату. Разница важная: пустое место читалось бы как
 * «рейсов нет».
 *
 * Лента прокручивается стрелками по краям и колесом мыши. Прокрутка — у самой
 * ленты, а не у страницы: дат много, и утаскивать за собой всю выдачу нельзя.
 */

/** На сколько столбцов уезжает лента за одно нажатие стрелки. */
const STEP = 4;

export function PriceStrip({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: PriceColumn) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  function updateEdges() {
    const track = trackRef.current;
    if (!track) return;

    setAtStart(track.scrollLeft <= 4);
    setAtEnd(track.scrollLeft + track.clientWidth >= track.scrollWidth - 4);
  }

  function scrollBy(direction: -1 | 1) {
    const track = trackRef.current;
    if (!track) return;

    const column = track.firstElementChild as HTMLElement | null;
    const width = column?.offsetWidth ?? 140;
    track.scrollBy({ left: direction * width * STEP, behavior: "smooth" });
  }

  return (
    <div className="relative">
      <div className="squircle flex items-center gap-1 rounded-db-md bg-db-surface-default p-4">
        <div
          ref={trackRef}
          onScroll={updateEdges}
          className="db-scroll-hidden flex flex-1 items-stretch gap-1 overflow-x-auto scroll-smooth"
        >
          {PRICE_COLUMNS.map((column) => {
            const active = column.id === value;

            return (
              <button
                key={column.id}
                type="button"
                onClick={() => onChange(column)}
                aria-pressed={active}
                className={
                  "squircle relative flex min-w-[136px] flex-1 flex-col items-center justify-center gap-0.5 rounded-db-md px-4 pt-3 pb-2 " +
                  "transition-[background-color,transform] duration-300 ease-db active:scale-[0.97] " +
                  (active ? "" : "hover:bg-db-surface-muted")
                }
              >
                {/*
                 * Жёлтая подложка не зажигается на новой дате и не гаснет на
                 * старой — она переезжает: один `layoutId` на всю ленту.
                 * Так видно, что выбор один и куда именно он перешёл.
                 */}
                {active && (
                  <motion.span
                    layoutId={reduced ? undefined : "price-strip-active"}
                    transition={{ duration: reduced ? 0 : 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="squircle absolute inset-0 rounded-db-md bg-db-surface-base"
                    aria-hidden
                  />
                )}

                <span
                  className="relative flex flex-col items-center gap-0.5"
                >
                <span
                  className={
                    "text-db-micro " +
                    (active ? "text-db-text-primary" : "text-db-text-secondary")
                  }
                >
                  {column.range}
                </span>

                {column.price ? (
                  <span
                    className={
                      "text-db-item font-medium " +
                      (column.cheap && !active ? "text-text-success" : "text-db-text-primary")
                    }
                  >
                    {column.price}
                  </span>
                ) : (
                  // Цены нет — предлагаем посмотреть: лупа вместо пустоты.
                  <span className="flex items-center py-1" title="Посмотреть цены на эту дату">
                    <Search className="size-4 text-db-text-primary" strokeWidth={1.5} aria-hidden />
                    <span className="sr-only">Посмотреть цены</span>
                  </span>
                )}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Стрелки вынесены за карточку — так в макете. */}
      <DbStripArrow
        side="left"
        label="Предыдущие даты"
        disabled={atStart}
        onClick={() => scrollBy(-1)}
        className="top-1/2 -left-5 -translate-y-1/2"
      />
      <DbStripArrow
        side="right"
        label="Следующие даты"
        disabled={atEnd}
        onClick={() => scrollBy(1)}
        className="top-1/2 -right-5 -translate-y-1/2"
      />
    </div>
  );
}

