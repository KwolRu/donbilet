"use client";

import { ChevronDown, Star } from "lucide-react";

import { DbButton } from "@/components/ui/db-button";
import { TransportBadge } from "./transport-art";
import { passengersSummary, seatsSummary, type Ticket } from "@app/core/mocks/tickets";

/**
 * Завершённая поездка одной строкой.
 *
 * Развёрнутая карточка прошлой поездки нужна редко, поэтому в списке она
 * свёрнута до строки: направление, дата, пассажиры, сумма и оценка. Поездка
 * без оценки вместо звезды показывает кнопку — это единственное действие,
 * которое от пользователя здесь ещё ждут.
 */
export function TicketRow({
  ticket,
  onRate,
  onExpand,
}: {
  ticket: Ticket;
  onRate: () => void;
  onExpand: () => void;
}) {
  return (
    <article className="squircle flex w-full items-center justify-between gap-6 rounded-db-xl bg-db-surface-default p-6 transition-[box-shadow] duration-300 ease-db hover:shadow-[0px_4px_12px_0px_rgba(0,0,0,0.08)]">
      <div className="flex min-w-0 items-center gap-6">
        <TransportBadge transport={ticket.transport} />

        <h3 className="truncate text-[20px] leading-8 font-medium text-db-text-primary">
          {ticket.departure.city} - {ticket.arrival.city}
        </h3>

        <span className="h-10 w-px shrink-0 bg-db-border-subtle" aria-hidden />

        <div className="flex shrink-0 flex-col">
          <span className="text-db-item font-medium text-db-text-primary">
            {ticket.departure.date}
          </span>
          <span className="text-db-caption text-db-text-secondary">
            {ticket.departure.time} → {ticket.arrival.time}
          </span>
        </div>

        <span className="h-10 w-px shrink-0 bg-db-border-subtle" aria-hidden />

        <div className="flex shrink-0 flex-col">
          <span className="text-db-item font-medium text-db-text-primary">
            {passengersSummary(ticket)}
          </span>
          <span className="text-db-caption text-db-text-secondary">{seatsSummary(ticket)}</span>
        </div>

        <span className="h-10 w-px shrink-0 bg-db-border-subtle" aria-hidden />

        <span className="shrink-0 text-[20px] leading-8 font-medium text-db-text-primary">
          {ticket.total}
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-4">
        {ticket.rating == null ? (
          <DbButton variant="lianer" onClick={onRate}>
            Оцените поездку
          </DbButton>
        ) : (
          // `leading-none`: строка в 32px поднимала бы число над звездой.
          <button
            type="button"
            onClick={onRate}
            aria-label="Изменить оценку поездки"
            className="squircle -m-1 flex items-center gap-3 rounded-db-xs p-1 transition-colors duration-300 ease-db hover:bg-db-surface-muted"
          >
            <Star
              className="size-6 shrink-0 fill-db-surface-base text-db-surface-base"
              strokeWidth={2}
              aria-hidden
            />
            <span className="text-[20px] leading-none font-medium text-db-text-primary">
              {ticket.rating}/5
            </span>
          </button>
        )}

        <button
          type="button"
          onClick={onExpand}
          aria-label="Подробности поездки"
          className="squircle flex size-10 items-center justify-center rounded-db-sm bg-db-surface-muted transition-[filter] duration-300 ease-db hover:brightness-95"
        >
          <ChevronDown className="size-4 text-db-text-primary" strokeWidth={1.5} aria-hidden />
        </button>
      </div>
    </article>
  );
}
