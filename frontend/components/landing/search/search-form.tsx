"use client";

import { useState } from "react";
import { ArrowLeftRight } from "lucide-react";

import { DbLinkButton } from "@/components/ui/db-button";
import { DbChip, DbSegmentedControl, DbToggle } from "@/components/ui/db-primitives";
import { MOCK_CITIES, type MockCity } from "@app/core/mocks/landing";
import { PUBLIC_ROUTES } from "@/lib/routing/public-paths";
import { CityField } from "./city-field";
import { DateField } from "./date-field";
import { DEFAULT_PASSENGERS, PassengersField, type Passengers } from "./passengers-field";

/**
 * Форма поиска в Hero.
 *
 * Работает на моках: города из `core/mocks/landing`, поиск никуда не ведёт —
 * страница результатов появится в следующей фазе. Состояние держится здесь,
 * а не в сторе: пока форма живёт только на главной. Когда появится страница
 * результатов, состояние переезжает в `core/store/trip-search`, откуда
 * канонические параметры уходят в URL.
 */

const TRANSPORT_TABS = [
  { value: "bus", label: "Автобус" },
  { value: "avia", label: "Авиабилеты" },
  { value: "rail", label: "Поезда" },
  { value: "hotels", label: "Отели" },
] as const;

type Transport = (typeof TRANSPORT_TABS)[number]["value"];

/**
 * Быстрые подсказки под формой.
 *
 * Группы стоят ровно под своими полями: левая — под «Откуда», правая — под
 * «Куда». Поэтому чип подставляет город в то поле, под которым нарисован, а
 * не в поле, вычисленное из пары маршрута.
 */
const QUICK_CITIES = {
  from: ["Санкт-Петербург", "Москва"],
  to: ["Москва", "Санкт-Петербург"],
} as const;

function findCity(name: string): MockCity | null {
  return MOCK_CITIES.find((city) => city.name === name) ?? null;
}

function addDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

export function SearchForm() {
  const [transport, setTransport] = useState<Transport>("bus");
  const [from, setFrom] = useState<MockCity | null>(findCity("Санкт-Петербург"));
  const [to, setTo] = useState<MockCity | null>(findCity("Владивосток"));
  const [date, setDate] = useState<Date>(() => addDays(6));
  const [passengers, setPassengers] = useState<Passengers>({ ...DEFAULT_PASSENGERS, adults: 4 });
  const [hotelsInNewTab, setHotelsInNewTab] = useState(true);

  function swap() {
    setFrom(to);
    setTo(from);
  }

  /**
   * Подсказка под формой подставляет свой город в поле, под которым стоит:
   * левая группа чипов — в «Откуда», правая — в «Куда».
   *
   * Если выбранный город уже занят соседним полем, города меняются местами —
   * иначе в обоих оказался бы один и тот же.
   */
  function pickCity(field: "from" | "to", name: string) {
    const city = findCity(name);
    if (!city) return;

    if (field === "from") {
      if (to?.id === city.id) setTo(from);
      setFrom(city);
      return;
    }

    if (from?.id === city.id) setFrom(to);
    setTo(city);
  }

  return (
    <div className="relative flex w-full flex-col items-center gap-3">
      {/* Без overflow-hidden: выпадающие панели полей выходят за низ карточки. */}
      <div className="flex w-full flex-col items-center squircle rounded-db-xl bg-db-surface-default">
        {/* Вкладки прижаты влево: справа на них наезжает автобус (left 778px). */}
        <div className="flex w-full flex-col items-start gap-8 p-4">
          <DbSegmentedControl
            options={TRANSPORT_TABS}
            value={transport}
            onChange={(next) => setTransport(next)}
          />
        </div>

        <span className="h-px w-[1188px] bg-db-border-subtle" aria-hidden />

        <div className="flex w-full flex-col items-center gap-8 p-4">
          <div className="relative flex w-full items-center gap-1">
            <CityField label="Откуда" value={from} onChange={setFrom} excludeId={to?.id ?? null} />

            <span className="h-[47px] w-px bg-db-border-subtle" aria-hidden />

            <CityField label="Куда" value={to} onChange={setTo} excludeId={from?.id ?? null} />

            <span className="h-[47px] w-px bg-db-border-subtle" aria-hidden />

            <DateField label="Дата" value={date} onChange={setDate} />

            <span className="h-[47px] w-px bg-db-border-subtle" aria-hidden />

            <PassengersField label="Кто едет" value={passengers} onChange={setPassengers} />

            {/*
             * Ссылка, а не кнопка: поиск — это переход на страницу выдачи, и
             * браузер должен вести себя с ним как с переходом (средняя кнопка,
             * новая вкладка, предзагрузка). Заодно экран загрузки между зонами
             * ловит именно клик по ссылке.
             */}
            <DbLinkButton
              href={PUBLIC_ROUTES.search}
              variant="primary"
              size="large"
              className="w-[231px] shrink-0"
            >
              Найти
            </DbLinkButton>

            {/* Кнопка обмена городами стоит на стыке полей «Откуда» и «Куда». */}
            <button
              type="button"
              onClick={swap}
              aria-label="Поменять города местами"
              className="group absolute top-[15px] left-[233px] flex items-center gap-2.5 squircle rounded-db-xs bg-db-surface-default p-1 outline outline-1 -outline-offset-1 outline-db-border-subtle transition-colors duration-300 ease-out hover:bg-db-surface-muted"
            >
              {/* Пол-оборота при наведении: подсказка, что города меняются местами. */}
              <ArrowLeftRight
                className="size-4 text-db-text-secondary transition-transform duration-300 ease-out group-hover:rotate-180"
                strokeWidth={1.5}
                aria-hidden
              />
            </button>
          </div>
        </div>
      </div>

      {/*
       * Ряд подсказок под формой. Ширины групп зафиксированы по макету
       * (240 / 256 / 144): без них чипы сходятся в одну плотную строку, а в
       * макете между парами маршрутов и датами есть воздух.
       */}
      <div className="flex w-full items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="flex w-60 items-center gap-2">
            {QUICK_CITIES.from.map((name) => (
              <DbChip key={name} onClick={() => pickCity("from", name)}>
                {name}
              </DbChip>
            ))}
          </div>

          <div className="flex w-64 items-center gap-2">
            {QUICK_CITIES.to.map((name) => (
              <DbChip key={name} onClick={() => pickCity("to", name)}>
                {name}
              </DbChip>
            ))}
          </div>

          <div className="flex w-36 items-center gap-2">
            <DbChip onClick={() => setDate(addDays(0))}>Сегодня</DbChip>
            <DbChip onClick={() => setDate(addDays(1))}>Завтра</DbChip>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[14px] leading-4 text-db-text-inverse">
            Искать отели в новой вкладке
          </span>
          <DbToggle
            checked={hotelsInNewTab}
            onChange={setHotelsInNewTab}
            label="Искать отели в новой вкладке"
          />
        </div>
      </div>
    </div>
  );
}
