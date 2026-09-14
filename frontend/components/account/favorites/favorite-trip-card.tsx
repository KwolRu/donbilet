"use client";

import { Heart, Star, Ticket } from "lucide-react";

import { DbButton } from "@/components/ui/db-button";
import { TransportArt } from "@/components/account/tickets/transport-art";
import type { FavoriteTrip } from "@app/core/mocks/favorites";

/**
 * Сохранённый рейс: слева расписание, справа корешок с ценой и выбором места.
 *
 * Форма та же, что у карточки билета, — включая просечку по стыку и вырезы
 * (`ticket-perforation`, `ticket-notch-*`). Это осознанно: сохранённый рейс и
 * купленный билет — одна и та же поездка на разных стадиях, и человек должен
 * узнавать её по виду. Корешок здесь всегда светлый: денег ещё не платили.
 */
export function FavoriteTripCard({
  trip,
  onRemove,
}: {
  trip: FavoriteTrip;
  onRemove: () => void;
}) {
  return (
    <article className="squircle flex w-full items-stretch rounded-db-xl">
      <div className="ticket-notch-right squircle flex flex-1 gap-6 rounded-l-db-xl bg-db-surface-default p-6 outline outline-1 -outline-offset-1 outline-db-border-subtle">
        <TransportArt transport={trip.transport} />

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
              onClick={onRemove}
              aria-label="Убрать из избранного"
              className="squircle flex size-10 shrink-0 items-center justify-center rounded-db-sm bg-bg-label-soft_06 transition-[filter,transform] duration-300 ease-db hover:brightness-95 active:scale-95"
            >
              <Heart
                className="size-4 fill-db-icon-error text-db-icon-error"
                strokeWidth={2}
                aria-hidden
              />
            </button>
          </div>

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
                  <span className="text-db-caption text-db-text-secondary">
                    {trip.departure.city}
                  </span>
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
        </div>
      </div>

      <div className="ticket-notch-left squircle relative flex w-[280px] shrink-0 flex-col justify-between gap-4 rounded-r-db-xl bg-db-surface-default p-6 outline outline-1 -outline-offset-1 outline-db-border-subtle">
        <span
          className="ticket-perforation pointer-events-none absolute inset-y-3 -left-0.5 w-1"
          aria-hidden
        />

        <div className="flex flex-col gap-2">
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

          <div className="flex flex-col">
            <span className="text-[36px] leading-10 font-medium text-db-text-primary">
              {trip.price}
            </span>
            <span className="text-db-caption text-db-text-secondary">за всех пассажиров</span>
          </div>
        </div>

        <DbButton
          variant="primary"
          fullWidth
          leftIcon={<Ticket className="size-4" strokeWidth={2} aria-hidden />}
        >
          Выбрать место
        </DbButton>
      </div>
    </article>
  );
}
