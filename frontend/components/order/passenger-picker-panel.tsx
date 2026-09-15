"use client";

import Image from "next/image";
import { X } from "lucide-react";

import { SidePanel } from "@/components/layout-panels/side-panel";
import {
  MOCK_PASSENGERS,
  documentLabel,
  formatBirthDate,
  shortName,
} from "@app/core/mocks/passengers";

const VISIBLE_PASSENGER_INDEXES = [1, 0, 2, 3, 5] as const;

export function PassengerPickerPanel({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (passengerIndex: number, documentIndex: number) => void;
}) {
  return (
    <SidePanel
      open={open}
      onClose={onClose}
      title="Пассажиры"
      className="squircle !w-[476px] !rounded-l-db-xl !p-0"
      header={
        <div className="flex flex-col items-end gap-4 bg-db-surface-default px-6 pt-6 pb-4">
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="flex size-6 items-center justify-center text-db-text-primary transition-[color,transform] duration-200 ease-db hover:text-db-text-secondary active:scale-90"
          >
            <X className="size-6" strokeWidth={2} aria-hidden />
          </button>
          <h2 className="w-full text-db-subsection font-medium text-db-text-primary">Пассажиры</h2>
        </div>
      }
    >
      <div data-order-passenger-picker className="flex flex-col gap-3 px-6 pb-6">
        {VISIBLE_PASSENGER_INDEXES.map((passengerIndex) => {
          const passenger = MOCK_PASSENGERS[passengerIndex];

          return (
            <article
              key={passenger.id}
              data-order-saved-passenger
              className="squircle flex w-full flex-col gap-4 overflow-hidden rounded-db-xl bg-db-surface-default p-4 outline outline-1 -outline-offset-1 outline-db-border-subtle"
            >
              <button
                type="button"
                onClick={() => onSelect(passengerIndex, 0)}
                className="group flex w-full items-center gap-3 text-left"
              >
                <Image
                  src={passenger.avatar}
                  alt=""
                  width={56}
                  height={56}
                  className="size-14 shrink-0 rounded-full object-cover"
                />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-[20px] leading-7 font-medium text-db-text-primary transition-colors duration-200 group-hover:text-db-text-secondary">
                    {shortName(passenger)}
                  </span>
                  <span className="text-db-item font-medium text-db-text-secondary">
                    {formatBirthDate(passenger.birthDate)}
                  </span>
                </span>
              </button>

              <div className="flex flex-wrap items-start gap-2">
                {passenger.documents.map((document, documentIndex) => (
                  <button
                    key={`${document.type}-${document.number}`}
                    type="button"
                    onClick={() => onSelect(passengerIndex, documentIndex)}
                    className="squircle rounded-db-sm bg-db-surface-muted p-3 text-db-caption text-db-text-primary transition-[background-color,transform] duration-200 ease-db hover:bg-db-border-default active:scale-[0.97]"
                  >
                    {documentLabel(document.type)}
                  </button>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </SidePanel>
  );
}
