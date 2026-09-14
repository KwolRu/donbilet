"use client";

import { AnimatePresence } from "motion/react";
import { Info, Minus, Plus, Ticket } from "lucide-react";
import { useState } from "react";

import { DbCheckbox } from "@/components/ui/db-checkbox";
import {
  DbDateField,
  DbSelectField,
  DbTextField,
} from "@/components/ui/db-form-fields";
import { DbTooltip } from "@/components/ui/db-tooltip";
import { PassengerPickerPanel } from "./passenger-picker-panel";
import {
  CITIZENSHIP_OPTIONS,
  DOCUMENT_TYPES,
  GENDER_OPTIONS,
  MOCK_PASSENGERS,
} from "@app/core/mocks/passengers";
import { ORDER_MAX_PASSENGERS, useOrderStore } from "@app/core/store/order";

type PassengerDraft = {
  lastName: string;
  firstName: string;
  middleName: string;
  gender: string;
  birthDate: string;
  citizenship: string;
  documentType: string;
  documentNumber: string;
  noMiddleName: boolean;
  insurance: boolean;
  baggage: boolean;
  baggageCount: number;
};

const INITIAL_PASSENGERS: PassengerDraft[] = [
  {
    lastName: "Демьяненко",
    firstName: "Константин",
    middleName: "Владимирович",
    gender: "male",
    birthDate: "1996-03-23",
    citizenship: "RU",
    documentType: "passport_rf",
    documentNumber: "5006 236703",
    noMiddleName: false,
    insurance: false,
    baggage: true,
    baggageCount: 2,
  },
  {
    lastName: "Демьяненко",
    firstName: "Полина",
    middleName: "Александровна",
    gender: "female",
    birthDate: "1999-03-23",
    citizenship: "RU",
    documentType: "passport_rf",
    documentNumber: "5006 235678",
    noMiddleName: false,
    insurance: true,
    baggage: false,
    baggageCount: 1,
  },
  {
    lastName: "Демьяненко",
    firstName: "Дмитрий",
    middleName: "Константинович",
    gender: "male",
    birthDate: "2020-04-10",
    citizenship: "RU",
    documentType: "birth_certificate",
    documentNumber: "5006 236703",
    noMiddleName: false,
    insurance: true,
    baggage: true,
    baggageCount: 1,
  },
];

function blankPassenger(): PassengerDraft {
  return {
    lastName: "",
    firstName: "",
    middleName: "",
    gender: "male",
    birthDate: "",
    citizenship: "RU",
    documentType: "passport_rf",
    documentNumber: "",
    noMiddleName: false,
    insurance: false,
    baggage: false,
    baggageCount: 1,
  };
}

function parseDate(value: string): Date | null {
  return value ? new Date(`${value}T00:00:00`) : null;
}

function toIsoDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function passengerFromAccount(index: number, documentIndex: number): PassengerDraft {
  const passenger = MOCK_PASSENGERS[index % MOCK_PASSENGERS.length];
  const document = passenger.documents[documentIndex] ?? passenger.documents[0];

  return {
    lastName: passenger.lastName,
    firstName: passenger.firstName,
    middleName: passenger.middleName,
    gender: passenger.gender,
    birthDate: passenger.birthDate,
    citizenship: passenger.citizenship,
    documentType: document?.type ?? "passport_rf",
    documentNumber: document?.number ?? "",
    noMiddleName: !passenger.middleName,
    insurance: false,
    baggage: false,
    baggageCount: 1,
  };
}

function SavedPassengerPicker({
  onSelect,
}: {
  onSelect: (passengerIndex: number, documentIndex: number) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="shrink-0">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="squircle flex items-center gap-1 rounded-db-xs bg-db-button-primary-bg p-2 text-db-chip text-db-text-primary transition-[filter,transform] duration-300 ease-db hover:brightness-95 active:scale-[0.97]"
      >
        <Ticket className="size-3" strokeWidth={1.5} aria-hidden />
        <span className="px-1">Выбрать пассажира</span>
      </button>

      <PassengerPickerPanel
        open={open}
        onClose={() => setOpen(false)}
        onSelect={(passengerIndex, documentIndex) => {
          onSelect(passengerIndex, documentIndex);
          setOpen(false);
        }}
      />
    </div>
  );
}

function BaggageInfo() {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative flex items-center">
      <button
        type="button"
        aria-label="Условия провоза багажа"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="text-db-text-tertiary transition-colors duration-200 hover:text-db-text-secondary"
      >
        <Info className="size-4" strokeWidth={1.5} aria-hidden />
      </button>

      <AnimatePresence>
        {open && (
          <DbTooltip className="!max-w-none">
            <span className="block w-[205px]">
              Чемодан или крупная сумка до 20 кг и размером до 80 × 50 × 30 см,
              которые перевозятся в багажном отделении. Оплачивается отдельно.
            </span>
          </DbTooltip>
        )}
      </AnimatePresence>
    </span>
  );
}

function PassengerCard({
  index,
  seat,
  value,
  onChange,
}: {
  index: number;
  seat?: number;
  value: PassengerDraft;
  onChange: (next: PassengerDraft) => void;
}) {
  const setField = <K extends keyof PassengerDraft>(field: K, next: PassengerDraft[K]) =>
    onChange({ ...value, [field]: next });

  return (
    <section
      data-order-passenger-card
      className="squircle flex w-full flex-col gap-4 rounded-db-xl bg-db-surface-default p-6 outline outline-1 -outline-offset-1 outline-db-border-subtle"
    >
      <div className="flex items-start justify-between">
        <div className="flex w-96 flex-col gap-0.5">
          <h3 className="text-[20px] leading-7 font-medium text-db-text-primary">
            Пассажир {index + 1}
          </h3>
          <span className="text-db-caption text-db-text-secondary">
            {seat ? `Место ${seat}` : "Место назначится автоматически"}
          </span>
        </div>

        <SavedPassengerPicker
          onSelect={(passengerIndex, documentIndex) =>
            onChange(passengerFromAccount(passengerIndex, documentIndex))
          }
        />
      </div>

      <div className="grid w-full grid-cols-3 gap-3">
        <DbTextField label="Фамилия" value={value.lastName} onChange={(next) => setField("lastName", next)} />
        <DbTextField label="Имя" value={value.firstName} onChange={(next) => setField("firstName", next)} />
        <DbTextField
          label="Отчество"
          value={value.noMiddleName ? "" : value.middleName}
          disabled={value.noMiddleName}
          onChange={(next) => setField("middleName", next)}
        />

        <DbSelectField
          label="Пол"
          value={value.gender}
          options={[...GENDER_OPTIONS]}
          onChange={(next) => setField("gender", next)}
        />
        <DbDateField
          label="Дата рождения"
          value={parseDate(value.birthDate)}
          max={new Date()}
          onChange={(next) => setField("birthDate", toIsoDate(next))}
        />
        <div className="flex items-center">
          <DbCheckbox
            checked={value.noMiddleName}
            onChange={(next) => {
              onChange({ ...value, noMiddleName: next, middleName: next ? "" : value.middleName });
            }}
          >
            Нет отчества
          </DbCheckbox>
        </div>

        <DbSelectField
          label="Гражданство"
          value={value.citizenship}
          options={[...CITIZENSHIP_OPTIONS]}
          searchable
          onChange={(next) => setField("citizenship", next)}
        />
        <DbSelectField
          label="Документ"
          value={value.documentType}
          options={[...DOCUMENT_TYPES]}
          onChange={(next) => setField("documentType", next)}
        />
        <DbTextField
          label="Номер и серия"
          value={value.documentNumber}
          onChange={(next) => setField("documentNumber", next)}
        />
      </div>

      <div className="squircle w-full rounded-db-md bg-db-surface-default p-4 outline outline-1 -outline-offset-1 outline-db-border-subtle">
        <DbCheckbox checked={value.insurance} onChange={(next) => setField("insurance", next)}>
          <span className="flex w-full items-center justify-between gap-4">
            <span>Страхование пассажира</span>
            <span className="text-db-caption text-db-text-secondary">389 ₽</span>
          </span>
        </DbCheckbox>
      </div>

      <div className="squircle flex w-full items-center justify-between gap-4 rounded-db-md bg-db-surface-default px-4 py-3 outline outline-1 -outline-offset-1 outline-db-border-subtle">
        <div className="flex flex-1 items-center gap-4">
          <DbCheckbox checked={value.baggage} onChange={(next) => setField("baggage", next)}>
            <span className="flex items-center gap-1">
              Багаж
              <BaggageInfo />
            </span>
          </DbCheckbox>

          <div
            className={
              "squircle flex h-8 items-center gap-2 rounded-db-xs bg-db-surface-default px-3 outline outline-1 -outline-offset-1 outline-db-border-default transition-opacity duration-200 " +
              (value.baggage ? "opacity-100" : "pointer-events-none opacity-0")
            }
            aria-hidden={!value.baggage}
          >
            <button
              type="button"
              aria-label={`Уменьшить количество багажа пассажира ${index + 1}`}
              disabled={value.baggageCount <= 1}
              onClick={() => setField("baggageCount", value.baggageCount - 1)}
              className="disabled:opacity-30"
            >
              <Minus className="size-4" strokeWidth={1.5} aria-hidden />
            </button>
            <span className="w-7 text-center text-db-button text-db-text-primary">
              {value.baggageCount}
            </span>
            <button
              type="button"
              aria-label={`Увеличить количество багажа пассажира ${index + 1}`}
              onClick={() => setField("baggageCount", value.baggageCount + 1)}
            >
              <Plus className="size-4" strokeWidth={1.5} aria-hidden />
            </button>
          </div>
        </div>

        <span className="text-db-caption text-db-text-secondary">
          {value.baggage ? `${289 * value.baggageCount} ₽` : "289 ₽"}
        </span>
      </div>
    </section>
  );
}

export function PassengerDetailsCard() {
  const passengerCount = useOrderStore((state) => state.passengerCount);
  const selectedSeats = useOrderStore((state) => state.selectedSeats);
  const setPassengerCount = useOrderStore((state) => state.setPassengerCount);
  const [passengers, setPassengers] = useState<PassengerDraft[]>(() =>
    Array.from(
      { length: ORDER_MAX_PASSENGERS },
      (_, index) => INITIAL_PASSENGERS[index] ?? blankPassenger(),
    ),
  );

  return (
    <section
      data-order-passenger-details
      className="squircle flex w-[755px] shrink-0 flex-col gap-4 rounded-db-xl bg-db-surface-default p-6"
    >
      <h2 className="text-db-subsection font-medium text-db-text-primary">Заполните данные</h2>

      <div className="flex w-full flex-col gap-4">
        {passengers.slice(0, passengerCount).map((passenger, index) => (
          <PassengerCard
            key={index}
            index={index}
            seat={selectedSeats[index]}
            value={passenger}
            onChange={(next) =>
              setPassengers((current) =>
                current.map((item, itemIndex) => (itemIndex === index ? next : item)),
              )
            }
          />
        ))}
      </div>

      <button
        type="button"
        disabled={passengerCount >= ORDER_MAX_PASSENGERS}
        onClick={() => setPassengerCount(passengerCount + 1)}
        className="squircle flex w-full items-center justify-center rounded-db-sm bg-db-button-tertiary-bg p-4 text-db-button text-db-text-primary transition-[filter,transform] duration-300 ease-db hover:brightness-95 active:scale-[0.99] disabled:opacity-40"
      >
        Добавить ещё одного пассажира
      </button>
    </section>
  );
}
