"use client";

import { Heart } from "lucide-react";

import { TransportArt } from "@/components/account/tickets/transport-art";
import type { FavoriteOffer } from "@app/core/mocks/favorites";

/**
 * Сохранённый вариант поездки — строка внутри направления.
 *
 * Кнопка справа убирает вариант из избранного: красная плашка из макета.
 * Сердце залитое, а не контурное, — оно показывает, что вариант уже сохранён,
 * и нажатие его снимает.
 */
export function FavoriteOfferRow({
  offer,
  onRemove,
}: {
  offer: FavoriteOffer;
  onRemove: () => void;
}) {
  return (
    <article className="squircle flex items-start justify-between gap-6 rounded-db-xl bg-db-surface-default p-6 outline outline-1 -outline-offset-1 outline-db-border-subtle transition-[outline-color] duration-300 ease-db hover:outline-db-border-default">
      <div className="flex items-center gap-6">
        <TransportArt transport={offer.transport} />

        <div className="flex w-56 flex-col gap-2">
          <div className="flex flex-col gap-0.5">
            <span className="text-[20px] leading-7 font-medium text-db-text-primary">
              {offer.price}
            </span>
            <span className="text-db-body text-db-text-primary">{offer.passengers}</span>
          </div>

          <span className="h-px w-full bg-db-border-subtle" aria-hidden />

          <span className="text-db-caption text-db-text-secondary">{offer.date}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={onRemove}
        aria-label="Убрать из избранного"
        className="squircle flex size-10 shrink-0 items-center justify-center rounded-db-sm bg-bg-label-soft_06 transition-[filter,transform] duration-300 ease-db hover:brightness-95 active:scale-95"
      >
        <Heart className="size-4 fill-db-icon-error text-db-icon-error" strokeWidth={2} aria-hidden />
      </button>
    </article>
  );
}
