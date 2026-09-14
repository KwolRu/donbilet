"use client";

import { useState } from "react";
import { ChevronDown, Star } from "lucide-react";

import { DbButton } from "@/components/ui/db-button";
import { TripSchedule } from "./trip-card";
import type { SearchTrip } from "@app/core/mocks/search";

/**
 * Компактный вид рейса — второй режим выдачи из макета.
 *
 * Здесь только расписание и цена в кнопке: когда рейсов много, важно быстро
 * сравнить время и сумму, а перевозчик с удобствами мешают. Стрелка
 * раскрывает подробности прямо в строке — уходить со страницы не нужно.
 *
 * Раскрытие через `db-collapse`, как в билетах: условный рендер даёт рывок и
 * ломает анимацию соседних карточек.
 */
export function TripCompactCard({ trip }: { trip: SearchTrip }) {
  const [open, setOpen] = useState(false);

  return (
    /*
     * Отклик на наведение — только тень и цвет обводки: любой сдвиг двигал бы
     * соседей в плотном списке, и строка «убегала» бы из-под курсора.
     */
    <article className="squircle group/card flex w-full items-stretch rounded-db-xl transition-[box-shadow] duration-300 ease-db hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
      {/*
       * Зелёная метка выгодного рейса — левый бордер карточки, а не слой
       * поверх неё. Бордер сам повторяет скругление: наложенные слои давали
       * зелёную дугу шире полосы и вылезали за левый край.
       */}
      <div
        className={
          "ticket-notch-right squircle relative flex flex-1 flex-col gap-4 overflow-hidden " +
          "rounded-l-db-xl bg-db-surface-default p-6 outline outline-1 -outline-offset-1 " +
          "outline-db-border-subtle " +
          (trip.highlighted ? "border-l-8 border-surface-base-success" : "")
        }
      >
        {trip.highlighted && <span className="sr-only">Выгодный рейс</span>}

        <TripSchedule trip={trip} />

        <div className={"db-collapse " + (open ? "db-collapse-open" : "")}>
          <div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-db-border-subtle pt-4 text-db-caption text-db-text-secondary">
              <span>
                Перевозчик:{" "}
                <span className="text-db-text-primary">{trip.carrier}</span>
              </span>
              <span>
                Пересадки:{" "}
                <span className="text-db-text-primary">
                  {trip.transfers === 0 ? "без пересадок" : `${trip.transfers}`}
                </span>
              </span>
              <span>
                Багаж:{" "}
                <span className="text-db-text-primary">
                  {trip.baggage ? "включён" : "за доплату"}
                </span>
              </span>
              <span>
                Возврат:{" "}
                <span className="text-db-text-primary">
                  {trip.refundable ? "возможен" : "не возвратный"}
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="ticket-notch-left squircle relative flex w-[320px] shrink-0 flex-col justify-between gap-4 rounded-r-db-xl bg-db-surface-default p-6 outline outline-1 -outline-offset-1 outline-db-border-subtle transition-[outline-color] duration-300 ease-db group-hover/card:outline-db-border-default">
        <span
          className="ticket-perforation pointer-events-none absolute inset-y-3 -left-0.5 w-1"
          aria-hidden
        />

        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-db-item font-medium text-db-text-primary">
            {trip.carrier}
          </span>

          <span className="flex shrink-0 items-center gap-1 py-1">
            <Star
              className="size-4 fill-db-surface-base text-db-surface-base"
              strokeWidth={2}
              aria-hidden
            />
            <span className="text-db-caption text-db-text-primary">
              {trip.rating.toLocaleString("ru-RU", { minimumFractionDigits: 1 })}
            </span>
          </span>
        </div>

        <div className="flex items-start gap-3">
          {/* `whitespace-nowrap`: «Выбрать место за 6 870 ₽» рвалось на две строки
              и кнопка становилась вдвое выше соседних. */}
          <DbButton variant="primary" className="flex-1 whitespace-nowrap">
            Выбрать место за {trip.price}
          </DbButton>

          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            aria-expanded={open}
            aria-label={open ? "Скрыть подробности" : "Показать подробности"}
            className="squircle flex size-10 shrink-0 items-center justify-center rounded-db-sm bg-db-button-tertiary-bg transition-[filter,transform] duration-300 ease-db hover:brightness-95 active:scale-95"
          >
            <ChevronDown
              className={
                "size-4 text-db-text-primary transition-transform duration-300 ease-db " +
                (open ? "rotate-180" : "")
              }
              strokeWidth={1.5}
              aria-hidden
            />
          </button>
        </div>
      </div>
    </article>
  );
}
