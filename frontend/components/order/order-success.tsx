"use client";

import Image from "next/image";
import { ArrowLeft, Download, Trash2 } from "lucide-react";

import successImage from "@assets/images/account/order/success.png";
import { MOCK_ORDER } from "@app/core/mocks/order";
import { ACCOUNT_ROUTES, PUBLIC_ROUTES } from "@/lib/routing/public-paths";
import { HotelsStrip } from "@/components/search/hotels-strip";
import { DbButton, DbLinkButton } from "@/components/ui/db-button";

const ORDER_NUMBER = "DB7843291";

function downloadTicket() {
  const ticket = [
    `Заказ ${ORDER_NUMBER}`,
    `${MOCK_ORDER.departure.city} — ${MOCK_ORDER.arrival.city}`,
    `${MOCK_ORDER.departure.date}, ${MOCK_ORDER.departure.time}`,
    `${MOCK_ORDER.departure.station}, ${MOCK_ORDER.departure.address}`,
    `Места: ${MOCK_ORDER.initialSeats.join(", ")}`,
  ].join("\n");
  const url = URL.createObjectURL(new Blob([ticket], { type: "text/plain;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${ORDER_NUMBER}.txt`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function ConfirmedTrip() {
  return (
    <section className="squircle flex flex-col gap-4 rounded-db-xl bg-db-surface-default p-6 outline outline-1 -outline-offset-1 outline-db-border-subtle">
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-4">
          <div className="flex flex-1 flex-col gap-1">
            <h3 className="text-db-item font-medium text-db-text-primary">
              {MOCK_ORDER.departure.city} - {MOCK_ORDER.arrival.city}
            </h3>
            <p className="text-db-body text-db-text-secondary">{MOCK_ORDER.departure.date}</p>
          </div>
          <button
            type="button"
            aria-label="Удалить билет"
            className="flex size-9 items-center justify-center rounded-db-xs text-db-icon-tertiary transition-colors duration-300 ease-db hover:bg-db-surface-muted hover:text-db-text-primary"
          >
            <Trash2 className="size-4" strokeWidth={1.5} aria-hidden />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <span className="text-[20px] leading-8 font-medium text-db-text-primary">
                {MOCK_ORDER.departure.time}
              </span>
              <span className="h-px flex-1 border-t border-db-border-default" aria-hidden />
              <span className="text-db-caption text-db-text-primary">~ 1 д 4 ч 30 м в пути</span>
              <span className="h-px flex-1 border-t border-db-border-default" aria-hidden />
              <span className="text-[20px] leading-8 font-medium text-db-text-primary">
                {MOCK_ORDER.arrival.time}
              </span>
            </div>
            <div className="flex justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-db-caption text-db-text-primary">{MOCK_ORDER.departure.date}</span>
                <span className="text-db-caption text-db-text-secondary">{MOCK_ORDER.departure.city}</span>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-db-caption text-db-text-primary">{MOCK_ORDER.arrival.date}</span>
                <span className="text-db-caption text-db-text-secondary">{MOCK_ORDER.arrival.city}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-between gap-4">
            <p className="text-db-caption leading-4 text-db-text-primary">
              {MOCK_ORDER.departure.station}
              <br />
              {MOCK_ORDER.departure.address}
            </p>
            <p className="text-right text-db-caption leading-4 text-db-text-primary">
              {MOCK_ORDER.arrival.station}
              <br />
              {MOCK_ORDER.arrival.address}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-start justify-between">
        <DbLinkButton
          href={PUBLIC_ROUTES.search}
          variant="ghost"
          size="small"
          leftIcon={<ArrowLeft className="size-4" strokeWidth={1.5} aria-hidden />}
        >
          Вернуться к поиску
        </DbLinkButton>

        <div className="flex items-center gap-4">
          <DbLinkButton
            href={ACCOUNT_ROUTES.tickets}
            variant="tertiary"
            size="small"
            className="w-56"
          >
            Открыть мои билеты
          </DbLinkButton>
          <DbLinkButton
            href={PUBLIC_ROUTES.search}
            size="small"
            className="h-10 w-56 whitespace-nowrap"
          >
            Заказать билет обратно
          </DbLinkButton>
        </div>
      </div>
    </section>
  );
}

export function OrderSuccess() {
  return (
    <div
      data-order-success
      className="mx-auto flex min-h-[1105px] w-[calc(100%-64px)] max-w-[1220px] flex-col pt-8 pb-16"
    >
      <h1 className="text-db-page font-medium text-db-text-primary">Билет куплен</h1>

      <div className="mt-6 flex flex-col gap-6">
        <section className="squircle flex flex-col gap-4 rounded-db-xl bg-db-surface-default p-6">
          <header className="flex items-start justify-between">
            <div className="flex items-center gap-6">
              <Image
                src={successImage}
                alt="Заказ подтверждён"
                width={166}
                height={117}
                priority
                className="h-[117px] w-[166px] object-contain"
              />
              <div className="flex w-[420px] flex-col gap-1">
                <h2 className="text-db-subsection font-medium text-db-text-primary">
                  Заказ {ORDER_NUMBER} подтверждён
                </h2>
                <p className="text-db-body leading-6 text-db-text-secondary">
                  Билет и детали поездки уже отправлены на вашу почту
                </p>
              </div>
            </div>

            <DbButton
              type="button"
              variant="secondary"
              size="small"
              leftIcon={<Download className="size-4" strokeWidth={1.5} aria-hidden />}
              onClick={downloadTicket}
            >
              Скачать билет
            </DbButton>
          </header>

          <ConfirmedTrip />
        </section>

        <HotelsStrip cityIn="во Владивостоке" actionVariant="plain" />
      </div>
    </div>
  );
}
