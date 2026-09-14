"use client";

import { Star } from "lucide-react";
import { useState } from "react";

import { DottedLinkText } from "@/components/common/dotted-link-text";
import { DbButton } from "@/components/ui/db-button";
import { DbCheckbox } from "@/components/ui/db-checkbox";
import { MOCK_ORDER } from "@app/core/mocks/order";
import { useOrderStore } from "@app/core/store/order";
import { selectRussianPlural } from "@app/core/utils/russian-plural";

function PriceLine({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div
      className={
        "flex items-end gap-1.5 text-db-caption " +
        (muted ? "text-db-text-secondary" : "text-db-text-primary")
      }
    >
      <span className={muted ? "max-w-[140px] leading-4" : "whitespace-nowrap leading-4"}>
        {label}
      </span>
      <span className="mb-1 min-w-3 flex-1 border-b border-dotted border-db-border-strong" aria-hidden />
      <span className="shrink-0 leading-4">{value}</span>
    </div>
  );
}

export function OrderSummaryCard() {
  const [passengerDataConfirmed, setPassengerDataConfirmed] = useState(true);
  const [personalDataAccepted, setPersonalDataAccepted] = useState(true);
  const [offerAccepted, setOfferAccepted] = useState(true);
  const checkoutStep = useOrderStore((state) => state.checkoutStep);
  const passengerCount = useOrderStore((state) => state.passengerCount);
  const selectedSeats = useOrderStore((state) => state.selectedSeats);
  const goToPassengers = useOrderStore((state) => state.goToPassengers);
  const goToPayment = useOrderStore((state) => state.goToPayment);
  const detailsStage = checkoutStep !== "seats";
  const paymentStage = checkoutStep === "payment";
  const selectionComplete = selectedSeats.length === passengerCount;
  const seatLabel = selectedSeats.length
    ? selectedSeats.length > 1
      ? `${selectedSeats.slice(0, -1).join(", ")} и ${selectedSeats.at(-1)}`
      : String(selectedSeats[0])
    : "не выбраны";
  const seatNoun = selectRussianPlural(selectedSeats.length, {
    one: "место",
    few: "места",
    many: "мест",
  });

  return (
    <aside
      className={"flex w-[445px] shrink-0 flex-col " + (detailsStage ? "sticky top-6" : "")}
      aria-label="Детали заказа"
    >
      <section
        data-order-summary-top
        className="order-notch-bottom squircle flex self-stretch flex-col gap-4 rounded-t-db-xl bg-db-surface-default p-6"
      >
        <div className="flex items-center justify-between">
          <span className="text-db-caption text-db-text-primary">{MOCK_ORDER.reviews} отзывов</span>
          <span className="flex items-center gap-1 text-db-caption text-db-text-primary">
            <Star className="size-4 fill-db-surface-base text-db-surface-base" strokeWidth={1.5} aria-hidden />
            {MOCK_ORDER.rating}
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <h2 className="text-db-item font-medium text-db-text-primary">
            {MOCK_ORDER.departure.city} - {MOCK_ORDER.arrival.city}
          </h2>
          <p className="text-db-body text-db-text-secondary">{MOCK_ORDER.departure.date}</p>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <span className="text-[20px] leading-8 font-medium text-db-text-primary">
                {MOCK_ORDER.departure.time}
              </span>
              <span className="h-px flex-1 border-t border-dashed border-db-border-default" aria-hidden />
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
            <p className="flex-1 text-db-caption text-db-text-primary">
              {MOCK_ORDER.departure.station}
              <br />
              {MOCK_ORDER.departure.address}
            </p>
            <p className="flex-1 text-right text-db-caption text-db-text-primary">
              {MOCK_ORDER.arrival.station}
              <br />
              {MOCK_ORDER.arrival.address}
            </p>
          </div>
        </div>

        <div className="squircle flex h-16 items-start justify-between rounded-db-md bg-db-surface-default p-4 outline outline-1 -outline-offset-1 outline-db-border-subtle">
          <div className="flex flex-col">
            <span className="text-db-item font-medium text-db-text-primary">{MOCK_ORDER.duration}</span>
            <span className="text-db-caption text-db-text-secondary">Местное время</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-db-item font-medium text-db-text-primary">
              {passengerCount} пасс
            </span>
            <span className="text-db-caption text-db-text-secondary">
              {seatLabel} {seatNoun}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-start gap-3">
          <DottedLinkText className="text-db-caption font-normal text-db-text-secondary">
            Условия возврата билета
          </DottedLinkText>
          <DottedLinkText className="text-db-caption font-normal text-db-text-secondary">
            Ограничения провоза багажа
          </DottedLinkText>
        </div>
      </section>

      <section
        data-order-summary-bottom
        className="order-notch-top squircle relative flex self-stretch flex-col gap-4 rounded-b-db-xl bg-db-surface-default p-6"
      >
        <span className="order-perforation-horizontal pointer-events-none absolute top-0 right-3 left-3 h-1" aria-hidden />

        <div className="flex flex-col gap-3">
          <strong className="text-[36px] leading-10 font-medium text-db-text-primary">
            {detailsStage ? MOCK_ORDER.passengerStepTotal : MOCK_ORDER.total}
          </strong>

          <div className="flex flex-col gap-2">
            {(detailsStage ? MOCK_ORDER.passengerStepPriceLines : MOCK_ORDER.priceLines).map((line) => (
              <PriceLine key={line.label} {...line} />
            ))}
          </div>
        </div>

        {detailsStage ? (
          <div className="flex w-full flex-col gap-4">
            <div className="flex flex-col gap-3">
              <DbCheckbox checked={passengerDataConfirmed} onChange={setPassengerDataConfirmed}>
                <span className="text-db-caption leading-4 text-db-text-secondary">
                  Подтверждаю, что данные пассажиров указаны верно
                </span>
              </DbCheckbox>
              <DbCheckbox checked={personalDataAccepted} onChange={setPersonalDataAccepted}>
                <span className="text-db-caption leading-4 text-db-text-secondary">
                  Соглашаюсь на <span className="underline underline-offset-2">обработку персональных данных</span>
                </span>
              </DbCheckbox>
              <DbCheckbox checked={offerAccepted} onChange={setOfferAccepted}>
                <span className="text-db-caption leading-4 text-db-text-secondary">
                  Принимаю <span className="underline underline-offset-2">условия публичной оферты</span>
                </span>
              </DbCheckbox>
            </div>

            <DbButton
              type="button"
              size="large"
              fullWidth
              className="h-14 !rounded-db-md"
              disabled={!passengerDataConfirmed || !personalDataAccepted || !offerAccepted}
              onClick={paymentStage ? () => undefined : goToPayment}
            >
              {paymentStage ? "Оплатить" : "Перейти к оплате"}
            </DbButton>
          </div>
        ) : (
          <div className="flex w-full flex-col">
            <DbButton
              type="button"
              size="large"
              fullWidth
              className="h-14 !rounded-db-md"
              disabled={!selectionComplete}
              aria-label={
                selectionComplete
                  ? "Ввести данные пассажиров"
                  : passengerCount === 3
                    ? "Сначала выберите три места"
                    : `Сначала выберите ${passengerCount} ${selectRussianPlural(passengerCount, {
                        one: "место",
                        few: "места",
                        many: "мест",
                      })}`
              }
              onClick={goToPassengers}
            >
              Ввести данные пассажиров
            </DbButton>
          </div>
        )}
      </section>
    </aside>
  );
}
