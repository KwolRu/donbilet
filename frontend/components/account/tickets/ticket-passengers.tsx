"use client";

import { ChevronDown, ShieldCheck } from "lucide-react";

import { passengersSummary, seatsSummary, type Ticket } from "@app/core/mocks/tickets";

/**
 * Пассажиры заказа: свёрнутая полоса и раскрытый список.
 *
 * Раскрытие идёт через `db-collapse` (grid-rows 0fr→1fr), а не условным
 * рендером: последний даёт рывок и ломает анимацию соседних карточек.
 * Свёрнутая полоса белая с обводкой, раскрытая — серая: так в макете видно,
 * что блок «открылся внутрь» карточки.
 */
export function TicketPassengers({
  ticket,
  open,
  onToggle,
}: {
  ticket: Ticket;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={
        "squircle flex w-full flex-col gap-4 rounded-db-md p-4 " +
        "outline outline-1 -outline-offset-1 outline-db-border-subtle " +
        "transition-colors duration-300 ease-db " +
        (open ? "bg-db-surface-muted" : "bg-db-surface-default")
      }
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 text-left"
      >
        <span className="flex flex-col gap-1">
          <span className="text-db-item font-medium text-db-text-primary">
            {passengersSummary(ticket)}
          </span>
          <span className="text-db-caption text-db-text-secondary">{seatsSummary(ticket)}</span>
        </span>

        {/*
         * Цвет кнопки — от состояния блока, и это не декор: раскрытый блок
         * серый, и кнопка на нём белая (`ghost`), свёрнутый белый — и кнопка
         * серая (`tertiary`). Так она видна в обоих состояниях.
         */}
        <span
          className={
            "squircle flex size-10 shrink-0 items-center justify-center rounded-db-sm " +
            "transition-colors duration-300 ease-db " +
            (open
              ? "bg-db-surface-default hover:bg-db-surface-muted"
              : "bg-db-button-tertiary-bg hover:brightness-95")
          }
        >
          <ChevronDown
            className={
              "size-4 text-db-text-secondary transition-transform duration-300 ease-db " +
              (open ? "rotate-180" : "")
            }
            strokeWidth={1.5}
            aria-hidden
          />
        </span>
      </button>

      <div className={"db-collapse " + (open ? "db-collapse-open" : "")}>
        <div className="overflow-hidden">
          <div className="h-px w-full bg-db-border-default" />

          <ul className="flex flex-col gap-4 pt-4">
            {ticket.passengers.map((passenger) => (
              <li key={passenger.id} className="flex items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-db-item font-medium text-db-text-primary">
                      {passenger.name}
                    </span>

                    {/* Значок страховки. Место в разметке занято всегда — иначе
                        имена соседних строк вставали бы по-разному. */}
                    <span
                      className={
                        "squircle flex size-5 items-center justify-center rounded-db-xs bg-db-surface-base " +
                        "transition-opacity duration-300 ease-db " +
                        (passenger.insurance ? "opacity-100" : "opacity-0")
                      }
                      title={passenger.insurance ? "Со страховкой" : undefined}
                      aria-hidden={!passenger.insurance}
                    >
                      <ShieldCheck className="size-3 text-db-text-primary" strokeWidth={2} />
                      <span className="sr-only">{passenger.insurance ? "Со страховкой" : ""}</span>
                    </span>
                  </div>

                  <span className="text-db-caption text-db-text-secondary">
                    {passenger.document}
                  </span>
                </div>

                <div className="flex shrink-0 items-center gap-6">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-db-micro text-db-text-secondary">Место</span>
                    <span className="text-db-item font-medium text-db-text-primary">
                      {passenger.seat}
                    </span>
                  </div>

                  <div className="flex flex-col gap-0.5">
                    <span className="text-db-micro text-db-text-secondary">№ билета</span>
                    <span className="text-db-item font-medium text-db-text-primary">
                      {passenger.ticketNumber}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
