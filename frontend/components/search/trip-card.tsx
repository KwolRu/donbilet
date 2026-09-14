"use client";

import {
  Coffee,
  Heart,
  Moon,
  Music,
  Plug,
  Snowflake,
  Star,
  Tv,
  Wifi,
} from "lucide-react";
import type { ComponentType } from "react";

import { DbButton } from "@/components/ui/db-button";
import { TransportArt } from "@/components/account/tickets/transport-art";
import { AMENITIES, type AmenityId, type SearchTrip } from "@app/core/mocks/search";

/**
 * Карточка рейса в выдаче.
 *
 * Форма та же, что у сохранённого рейса в «Избранном», — и это осознанно:
 * один и тот же рейс человек встречает в поиске, в избранном и в билетах,
 * и узнавать его он должен по виду. Отличия от избранного ровно в том, чего
 * там нет: бейдж возвратности, удобства, остаток мест и цена «за всех».
 *
 * Сердце переключает избранное прямо из выдачи: уходить ради этого на
 * страницу рейса не нужно.
 */

const AMENITY_ICON: Record<AmenityId, ComponentType<{ className?: string; strokeWidth?: number }>> = {
  air: Snowflake,
  wifi: Wifi,
  tv: Tv,
  toilet: Plug,
  night: Moon,
  coffee: Coffee,
  music: Music,
  socket: Plug,
};

export function TripCard({
  trip,
  onToggleFavorite,
}: {
  trip: SearchTrip;
  onToggleFavorite: () => void;
}) {
  return (
    <article className="squircle flex w-full items-stretch rounded-db-xl">
      <div className="ticket-notch-right squircle flex flex-1 gap-6 rounded-l-db-xl bg-db-surface-default p-6 outline outline-1 -outline-offset-1 outline-db-border-subtle">
        <div className="flex w-44 shrink-0 flex-col justify-between border-r border-db-border-subtle pr-4">
          <span className="squircle w-fit rounded-db-full bg-db-surface-primary px-2 py-0.5 text-db-chip text-db-text-inverse">
            {trip.refundable ? "Возвратный" : "Не возвратный"}
          </span>

          <TransportArt transport={trip.transport} />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="flex items-start gap-4">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <h3 className="truncate text-db-item font-medium text-db-text-primary">
                {trip.carrier}
              </h3>
              <p className="text-db-body text-db-text-secondary">Перевозчик</p>
            </div>

            <button
              type="button"
              onClick={onToggleFavorite}
              aria-pressed={trip.favorite}
              aria-label={trip.favorite ? "Убрать из избранного" : "В избранное"}
              className={
                "squircle flex size-10 shrink-0 items-center justify-center rounded-db-sm " +
                "transition-[background-color,filter,transform] duration-300 ease-db active:scale-95 " +
                (trip.favorite
                  ? "bg-bg-label-soft_06 hover:brightness-95"
                  : "bg-db-surface-muted hover:bg-bg-label-soft_06")
              }
            >
              <Heart
                className={
                  "size-4 transition-colors duration-300 ease-db " +
                  (trip.favorite
                    ? "fill-db-icon-error text-db-icon-error"
                    : "text-db-text-secondary")
                }
                strokeWidth={2}
                aria-hidden
              />
            </button>
          </div>

          <TripSchedule trip={trip} />

          {/* Удобства рейса: иконки на серых плитках, подпись — в `title`. */}
          <ul className="flex flex-wrap items-center gap-2">
            {trip.amenities.map((id) => {
              const Icon = AMENITY_ICON[id];
              const label = AMENITIES.find((item) => item.id === id)?.label ?? "";

              return (
                <li
                  key={id}
                  title={label}
                  className="squircle flex size-8 items-center justify-center rounded-db-xs bg-db-surface-muted transition-colors duration-300 ease-db hover:bg-db-border-subtle"
                >
                  <Icon className="size-4 text-db-text-secondary" strokeWidth={1.5} />
                  <span className="sr-only">{label}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className="ticket-notch-left squircle relative flex w-[280px] shrink-0 flex-col justify-between gap-4 rounded-r-db-xl bg-db-surface-default p-6 outline outline-1 -outline-offset-1 outline-db-border-subtle">
        <span
          className="ticket-perforation pointer-events-none absolute inset-y-3 -left-0.5 w-1"
          aria-hidden
        />

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-db-caption text-db-text-primary">{trip.reviews} отзывов</span>

            <span className="flex items-center gap-1">
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

          <div className="flex flex-col gap-0.5">
            <span className="text-[36px] leading-10 font-medium text-db-text-primary">
              {trip.price}
            </span>
            <span className="text-db-caption text-db-text-secondary">{trip.priceNote}</span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {/*
           * Остаток мест — предупреждение, а не украшение: когда их мало,
           * подпись краснеет. Порог 10 взят как «меньше десятка»: точную
           * границу задаст API вместе с полем `seatsLeft`.
           */}
          <span
            className={
              "text-db-caption " +
              (trip.seatsLeft <= 10 ? "text-db-text-error" : "text-db-text-secondary")
            }
          >
            {trip.seatsLeft} осталось
          </span>

          <DbButton variant="primary" fullWidth>
            Выбрать место
          </DbButton>
        </div>
      </div>
    </article>
  );
}

/** Расписание рейса: время, длительность, города и остановки. */
export function TripSchedule({ trip }: { trip: SearchTrip }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <span className="text-[20px] leading-8 font-medium text-db-text-primary">
            {trip.departure.time}
          </span>

          <span className="flex flex-1 items-center gap-2">
            <span className="h-px flex-1 bg-db-border-default" />
            <span className="text-db-caption text-db-text-primary">{trip.duration}</span>
            <span className="h-px flex-1 bg-db-border-default" />
          </span>

          <span className="text-[20px] leading-8 font-medium text-db-text-primary">
            {trip.arrival.time}
          </span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-db-caption text-db-text-primary">{trip.departure.date}</span>
            <span className="text-db-caption text-db-text-secondary">{trip.departure.city}</span>
          </div>

          <div className="flex flex-col items-end gap-1">
            <span className="text-db-caption text-db-text-primary">{trip.arrival.date}</span>
            <span className="text-db-caption text-db-text-secondary">{trip.arrival.city}</span>
          </div>
        </div>
      </div>

      <div className="flex items-start justify-between gap-8">
        <span className="text-db-caption text-db-text-primary">
          {trip.departure.station}
          <br />
          {trip.departure.address}
        </span>
        <span className="text-right text-db-caption text-db-text-primary">
          {trip.arrival.station}
          <br />
          {trip.arrival.address}
        </span>
      </div>
    </div>
  );
}
