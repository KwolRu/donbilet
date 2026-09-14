"use client";

import { useState } from "react";
import { ChevronUp, Download, MessageCircle, Star, Trash2, Wallet } from "lucide-react";

import { DbButton } from "@/components/ui/db-button";
import { TicketPassengers } from "./ticket-passengers";
import { TransportArt } from "./transport-art";
import type { Ticket } from "@app/core/mocks/tickets";

/**
 * Карточка заказа: слева рейс, справа отрывной корешок с ценой.
 *
 * По макету 1526×340 (раскрытая выше): info 1246 + корешок 280. Корешок
 * «отрывается» — по стыку идёт пунктир, а сверху и снизу его надкусывают два
 * круга цветом рабочей области. Круги и пунктир рисуются здесь, а не
 * картинкой: карточка тянется по высоте вместе с содержимым.
 *
 * Корешок бывает двух видов и это не оформление, а состояние заказа:
 *   тёмный  — предстоящая поездка, деньги ещё в игре (оплатить, вернуть);
 *   светлый — завершённая, вместо суммы к оплате — оценка и «повторить».
 */
export function TicketCard({
  ticket,
  variant = "upcoming",
  defaultExpanded = false,
  onRefund,
  onRate,
  onCollapse,
}: {
  ticket: Ticket;
  variant?: "upcoming" | "completed";
  defaultExpanded?: boolean;
  onRefund: () => void;
  onRate: () => void;
  /** Свернуть завершённую поездку обратно в строку. */
  onCollapse?: () => void;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const dark = variant === "upcoming";

  return (
    <article className="squircle flex w-full items-stretch rounded-db-xl">
      <div className="ticket-notch-right squircle flex flex-1 gap-4 rounded-l-db-xl bg-db-surface-default p-6 outline outline-1 -outline-offset-1 outline-db-border-subtle">
        {/* Левая колонка: тип билета, номера и иллюстрация, прижатая к низу. */}
        <div className="flex w-44 shrink-0 flex-col justify-between border-r border-db-border-subtle pr-4">
          <div className="flex flex-col gap-3">
            <span className="squircle w-fit rounded-db-full bg-db-surface-primary px-2 py-0.5 text-db-chip text-db-text-inverse">
              {ticket.refundable ? "Возвратный" : "Не возвратный"}
            </span>

            <div className="flex flex-col">
              <span className="text-db-micro text-db-text-secondary">{ticket.numberLabel}</span>
              <span className="text-db-micro text-db-text-primary">{ticket.number}</span>
            </div>

            <div className="flex flex-col">
              <span className="text-db-micro text-db-text-secondary">Рейс</span>
              <span className="text-db-micro text-db-text-primary">{ticket.raceNumber}</span>
            </div>
          </div>

          <TransportArt transport={ticket.transport} />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="flex items-start gap-4">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <h3
                className={
                  "truncate font-medium text-db-text-primary " +
                  (variant === "completed" ? "text-db-subsection" : "text-db-item")
                }
              >
                {ticket.departure.city} - {ticket.arrival.city}
              </h3>
              <p className="text-db-body text-db-text-secondary">{ticket.departure.date}</p>
            </div>

            {/* Действия над заказом. У завершённой поездки писать некому —
                остаётся только удалить её из списка. */}
            <div className="flex shrink-0 items-center gap-4 p-1">
              <button
                type="button"
                aria-label="Удалить заказ"
                className="text-db-text-secondary transition-colors duration-300 ease-db hover:text-db-text-primary"
              >
                <Trash2 className="size-4" strokeWidth={1.5} aria-hidden />
              </button>

              {variant === "upcoming" && (
                <button
                  type="button"
                  aria-label="Написать в поддержку"
                  className="text-db-text-secondary transition-colors duration-300 ease-db hover:text-db-text-primary"
                >
                  <MessageCircle className="size-4" strokeWidth={1.5} aria-hidden />
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-3">
                <span className="text-[20px] leading-8 font-medium text-db-text-primary">
                  {ticket.departure.time}
                </span>

                <span className="flex flex-1 items-center gap-2">
                  <span className="h-px flex-1 bg-db-border-subtle" />
                  <span className="text-db-caption text-db-text-primary">{ticket.duration}</span>
                  <span className="h-px flex-1 bg-db-border-subtle" />
                </span>

                <span className="text-[20px] leading-8 font-medium text-db-text-primary">
                  {ticket.arrival.time}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-db-caption text-db-text-primary">
                    {ticket.departure.date}
                  </span>
                  <span className="text-db-caption text-db-text-secondary">
                    {ticket.departure.city}
                  </span>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <span className="text-db-caption text-db-text-primary">{ticket.arrival.date}</span>
                  <span className="text-db-caption text-db-text-secondary">
                    {ticket.arrival.city}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-start justify-between gap-8">
              <span className="text-db-caption text-db-text-primary">
                {ticket.departure.station}
                <br />
                {ticket.departure.address}
              </span>
              <span className="text-right text-db-caption text-db-text-primary">
                {ticket.arrival.station}
                <br />
                {ticket.arrival.address}
              </span>
            </div>
          </div>

          <TicketPassengers
            ticket={ticket}
            open={expanded}
            onToggle={() => setExpanded((current) => !current)}
          />
        </div>
      </div>

      <TicketStub
        ticket={ticket}
        dark={dark}
        onRefund={onRefund}
        onRate={onRate}
        onCollapse={onCollapse}
      />
    </article>
  );
}

/**
 * Отрывной корешок справа.
 *
 * Полукруги по стыку вырезаны маской (`ticket-notch-*`), а не нарисованы
 * кругами поверх: круг пришлось бы красить в цвет фона, и на стыке двух
 * половин карточки он читался бы как приклеенная нашлёпка.
 */
function TicketStub({
  ticket,
  dark,
  onRefund,
  onRate,
  onCollapse,
}: {
  ticket: Ticket;
  dark: boolean;
  onRefund: () => void;
  onRate: () => void;
  onCollapse?: () => void;
}) {
  const paid = ticket.status === "paid";

  return (
    <div
      className={
        "ticket-notch-left squircle relative flex w-[280px] shrink-0 flex-col justify-between gap-4 rounded-r-db-xl p-6 " +
        (dark
          ? "bg-db-surface-primary"
          : "bg-db-surface-default outline outline-1 -outline-offset-1 outline-db-border-subtle")
      }
    >
      {/* Просечка по линии отрыва. Отступ 12px сверху и снизу — чтобы она не
          упиралась в вырезы, а начиналась после них. */}
      <span
        className="ticket-perforation pointer-events-none absolute inset-y-3 -left-0.5 w-1"
        aria-hidden
      />

      <div className="flex flex-col gap-3">
        {dark ? (
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2">
              <span
                className={
                  "squircle rounded-db-full px-2 py-0.5 text-db-chip " +
                  (paid
                    ? "bg-bg-label-soft_02 text-text-success"
                    : "bg-bg-label-soft_06 text-db-icon-error")
                }
              >
                {paid ? "Оплачено" : "Не оплачено"}
              </span>

              {/* Время до снятия брони. Место держится всегда: иначе сумма
                  подпрыгивает, когда таймер исчезает после оплаты. */}
              <span
                className={
                  "text-db-chip text-db-text-tertiary " + (ticket.payDeadline ? "" : "opacity-0")
                }
              >
                {ticket.payDeadline ?? "00:00"}
              </span>
            </div>

            <span className="text-[36px] leading-10 font-medium text-db-text-inverse">
              {ticket.total}
            </span>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2">
              {/*
               * Оценка — кнопка: нажатие открывает панель с критериями. Раньше
               * это делала стрелка справа, и поездку нельзя было свернуть
               * обратно, не открыв форму отзыва.
               *
               * `leading-none` на числе: строка в 32px поднимала цифру над
               * звездой — при одинаковом `items-center` они всё равно стояли
               * вразнобой.
               */}
              <button
                type="button"
                onClick={onRate}
                aria-label={ticket.rating ? "Изменить оценку поездки" : "Оценить поездку"}
                className="squircle -m-1 flex items-center gap-3 rounded-db-xs p-1 transition-colors duration-300 ease-db hover:bg-db-surface-muted"
              >
                <Star
                  className="size-6 shrink-0 fill-db-surface-base text-db-surface-base"
                  strokeWidth={2}
                  aria-hidden
                />
                <span className="text-[20px] leading-none font-medium text-db-text-primary">
                  {ticket.rating ?? "—"}/5
                </span>
              </button>

              <button
                type="button"
                onClick={onCollapse}
                aria-label="Свернуть поездку"
                className="squircle flex size-10 items-center justify-center rounded-db-sm bg-db-surface-muted transition-[filter] duration-300 ease-db hover:brightness-95"
              >
                <ChevronUp className="size-4 text-db-text-primary" strokeWidth={1.5} aria-hidden />
              </button>
            </div>

            <span className="text-[36px] leading-[50px] font-medium text-db-text-primary">
              {ticket.total}
            </span>
          </div>
        )}

        <ul className="flex w-[212px] flex-col gap-2 pb-4">
          {ticket.priceLines.map((line) => (
            <li key={line.label} className="flex items-end gap-1.5">
              <span
                className={
                  "text-db-caption " +
                  (line.muted
                    ? "text-db-text-secondary"
                    : dark
                      ? "text-db-text-inverse"
                      : "text-db-text-primary")
                }
              >
                {line.label}
              </span>
              <span
                className={
                  "mb-1 h-px flex-1 " + (dark ? "bg-db-border-strong" : "bg-db-border-default")
                }
                aria-hidden
              />
              <span
                className={
                  "shrink-0 text-db-caption " +
                  (line.muted
                    ? "text-db-text-secondary"
                    : dark
                      ? "text-db-text-inverse"
                      : "text-db-text-primary")
                }
              >
                {line.value}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-3">
        {dark ? (
          <>
            <DbButton
              variant="primary"
              fullWidth
              leftIcon={
                paid ? (
                  <Download className="size-4" strokeWidth={2} aria-hidden />
                ) : (
                  <Wallet className="size-4" strokeWidth={2} aria-hidden />
                )
              }
            >
              {paid ? "Скачать билет" : "Оплатить"}
            </DbButton>

            <DbButton variant="secondary" fullWidth onClick={onRefund}>
              Вернуть билет
            </DbButton>
          </>
        ) : (
          <DbButton variant="primary" fullWidth>
            Повторить поездку
          </DbButton>
        )}
      </div>
    </div>
  );
}
