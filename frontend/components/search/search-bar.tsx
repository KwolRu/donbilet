"use client";

import Image from "next/image";
import { useState } from "react";
import { ArrowLeftRight } from "lucide-react";

import busArt from "@assets/images/landing/Hero/Bus.png";
import hotelArt from "@assets/images/account/tickets/hotel.png";
import planeArt from "@assets/images/account/tickets/plane.png";
import trainArt from "@assets/images/account/tickets/train.png";
import { DbButton } from "@/components/ui/db-button";
import { CityField } from "@/components/landing/search/city-field";
import { DateField } from "@/components/landing/search/date-field";
import {
  DEFAULT_PASSENGERS,
  PassengersField,
  type Passengers,
} from "@/components/landing/search/passengers-field";
import { MOCK_CITIES, type MockCity } from "@app/core/mocks/landing";
import { TRANSPORT_TABS, type TransportTab } from "@app/core/mocks/search";

/** Город по названию: начальные значения полей заданы в макете строками. */
function findCity(name: string): MockCity | null {
  return MOCK_CITIES.find((city) => city.name === name) ?? null;
}

/**
 * Строка поиска над выдачей: те же поля, что в форме на главной.
 *
 * Поля взяты один в один (`CityField`, `DateField`, `PassengersField`) — это
 * тот же поиск, просто в другом месте, и человек должен работать с ним
 * одинаково. Отличий от главной два: нет вкладок транспорта внутри карточки
 * (они вынесены плитками под строку) и нет чипов-подсказок.
 *
 * Плитки транспорта показывают цену «от» по каждому виду: выбор здесь — это
 * переключение выдачи, а не фильтр внутри неё.
 */

const ART: Record<TransportTab["value"], typeof busArt> = {
  bus: busArt,
  plane: planeArt,
  train: trainArt,
  hotel: hotelArt,
};

export function SearchBar({
  transport,
  onTransportChange,
}: {
  transport: TransportTab["value"];
  onTransportChange: (next: TransportTab["value"]) => void;
}) {
  const [from, setFrom] = useState<MockCity | null>(findCity("Санкт-Петербург"));
  const [to, setTo] = useState<MockCity | null>(findCity("Владивосток"));
  const [date, setDate] = useState<Date>(() => {
    const next = new Date();
    next.setDate(next.getDate() + 3);
    return next;
  });
  const [passengers, setPassengers] = useState<Passengers>({ ...DEFAULT_PASSENGERS, adults: 4 });

  function swap() {
    setFrom(to);
    setTo(from);
  }

  return (
    // Два разных блока, а не один: белая панель с полями — это форма поиска,
    // плитки транспорта под ней стоят на фоне страницы и к форме не относятся.
    // В макете между ними 17px серого поля.
    <div className="flex w-full flex-col items-center">
      <div className="flex w-full flex-col items-center border-t border-db-border-subtle bg-db-surface-default">
        <div className="flex w-[1220px] flex-col items-center gap-8 p-4">
        <div className="relative flex w-full items-center gap-1">
          <CityField label="Откуда" value={from} onChange={setFrom} excludeId={to?.id ?? null} />

          <span className="h-12 w-px bg-db-border-subtle" aria-hidden />

          <CityField label="Куда" value={to} onChange={setTo} excludeId={from?.id ?? null} />

          <span className="h-12 w-px bg-db-border-subtle" aria-hidden />

          <DateField label="Туда" value={date} onChange={setDate} />

          <span className="h-12 w-px bg-db-border-subtle" aria-hidden />

          <PassengersField label="Кто едет" value={passengers} onChange={setPassengers} />

          <DbButton variant="primary" size="large" className="w-56 shrink-0">
            Найти
          </DbButton>

          {/* Обмен городами — на стыке полей «Откуда» и «Куда», как на главной. */}
          <button
            type="button"
            onClick={swap}
            aria-label="Поменять города местами"
            className="group absolute top-[15px] left-[234px] flex items-center gap-2.5 squircle rounded-db-xs bg-db-surface-default p-1 outline outline-1 -outline-offset-1 outline-db-border-subtle transition-colors duration-300 ease-db hover:bg-db-surface-muted"
          >
            <ArrowLeftRight
              className="size-4 text-db-text-secondary transition-transform duration-300 ease-db group-hover:rotate-180"
              strokeWidth={1.5}
              aria-hidden
            />
          </button>
          </div>
        </div>
      </div>

      {/*
       * Плитки транспорта: свой блок на фоне страницы. 17px от белой панели —
       * значение из макета, поэтому число, а не ближайший шаг шкалы.
       */}
      <div className="w-full pt-[17px]">
        <div className="mx-auto flex w-[1220px] items-center gap-4">
          {TRANSPORT_TABS.map((tab) => {
            const active = tab.value === transport;

            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => onTransportChange(tab.value)}
                aria-pressed={active}
                className={
                  "squircle flex items-center gap-3 rounded-db-md p-4 text-left " +
                  "outline outline-1 -outline-offset-1 " +
                  "transition-[background-color,outline-color,transform] duration-300 ease-db active:scale-[0.98] " +
                  (active
                    ? "bg-bg-surface-base-elevated outline-db-border-hover"
                    : "bg-db-surface-default outline-transparent hover:bg-db-surface-muted")
                }
              >
                <Image
                  src={ART[tab.value]}
                  alt=""
                  width={70}
                  height={40}
                  aria-hidden
                  className="h-10 w-[70px] shrink-0 object-contain"
                />

                <span className="flex w-28 flex-col gap-0.5">
                  <span className="text-db-micro text-db-text-secondary">{tab.label}</span>
                  <span className="text-db-item font-medium text-db-text-primary">{tab.price}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
