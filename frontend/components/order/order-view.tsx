"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { OrderProgress } from "./order-progress";
import { OrderSummaryCard } from "./order-summary-card";
import { PassengerDetailsCard } from "./passenger-details-card";
import { PaymentCard } from "./payment-card";
import { OrderSuccess } from "./order-success";
import { ReservationTimer } from "./reservation-timer";
import { SeatSelectionCard } from "./seat-selection-card";
import { useOrderStore } from "@app/core/store/order";
import { PUBLIC_ROUTES } from "@/lib/routing/public-paths";

export function OrderView() {
  const checkoutStep = useOrderStore((state) => state.checkoutStep);
  const activeStep = checkoutStep === "payment" ? 2 : checkoutStep === "passengers" ? 1 : 0;

  if (checkoutStep === "success") return <OrderSuccess />;

  return (
    <div
      data-order-container
      className="mx-auto flex min-h-[964px] w-[calc(100%-64px)] max-w-[1220px] flex-col pt-8 pb-16"
    >
      <div className="flex items-center justify-between">
        <Link
          href={PUBLIC_ROUTES.search}
          className="group flex w-[176px] items-center gap-2 py-1 text-db-caption text-db-text-primary"
        >
          <ArrowLeft
            className="size-4 transition-transform duration-300 ease-db group-hover:-translate-x-0.5"
            strokeWidth={1.5}
            aria-hidden
          />
          <span className="db-link-underline">Поиск билетов</span>
        </Link>

        <OrderProgress activeStep={activeStep} />
      </div>

      <header className="mt-6 flex items-start justify-between">
        <div className="flex w-[600px] flex-col gap-1">
          <h1 className="text-db-page font-medium text-db-text-primary">Покупка билета</h1>
          <p className="text-db-caption leading-5 text-db-text-secondary">
            Билет почти ваш! Осталось заполнить данные и оплатить — это быстро
          </p>
        </div>

        <ReservationTimer />
      </header>

      <div className="mt-6 flex items-start gap-5">
        {checkoutStep === "seats" ? (
          <SeatSelectionCard />
        ) : checkoutStep === "passengers" ? (
          <PassengerDetailsCard />
        ) : (
          <PaymentCard />
        )}
        <OrderSummaryCard />
      </div>
    </div>
  );
}
