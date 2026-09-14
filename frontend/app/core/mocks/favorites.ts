/**
 * Мок-данные раздела «Избранное».
 *
 * Форма записи повторяет ожидаемый ответ API (`GET /api/favorites`): при
 * подключении стенда (блокер B1) меняется только источник.
 *
 * Избранное собрано по направлениям, а не плоским списком: в макете сохранённые
 * варианты сгруппированы маршрутом, и это осмысленно — человек следит за ценой
 * «Новосибирск — Владивосток», а не за отдельной датой.
 */

import type { TransportKind } from "./tickets";

/** Сохранённый вариант поездки — строка внутри направления. */
export type FavoriteOffer = {
  id: number;
  transport: TransportKind;
  /** «от 86 542 ₽» — цена показывается как «от», она может измениться. */
  price: string;
  /** «за 4 взрослых» */
  passengers: string;
  date: string;
};

/** Сохранённый рейс — карточка с корешком: у него есть перевозчик и место. */
export type FavoriteTrip = {
  id: number;
  transport: TransportKind;
  carrier: string;
  rating: number;
  reviews: number;
  price: string;
  departure: { time: string; date: string; city: string; station: string; address: string };
  arrival: { time: string; date: string; city: string; station: string; address: string };
  duration: string;
};

export type FavoriteDirection = {
  id: number;
  title: string;
  offers: FavoriteOffer[];
  trips: FavoriteTrip[];
};

const SPB = {
  time: "19:50",
  date: "17 августа, пн",
  city: "Санкт-Петербург",
  station: "Автовокзал №2",
  address: "наб. Обводного канала, 36",
};

const KRASNODAR = {
  time: "01:50",
  date: "18 августа, вт",
  city: "Краснодар",
  station: "Автовокзал «Южный»",
  address: "ул. Береговая, 1А",
};

function trip(id: number, transport: TransportKind): FavoriteTrip {
  return {
    id,
    transport,
    carrier: "ТФ Движение-2000",
    rating: 4.8,
    reviews: 736,
    price: "6 870 ₽",
    departure: SPB,
    arrival: KRASNODAR,
    duration: "~ 1 д 4 ч 30 м в пути",
  };
}

export const MOCK_FAVORITES: FavoriteDirection[] = [
  {
    id: 1,
    title: "Новосибирск — Владивосток",
    offers: [
      { id: 11, transport: "bus", price: "от 86 542 ₽", passengers: "за 4 взрослых", date: "17 августа, пн" },
      { id: 12, transport: "train", price: "от 43 609 ₽", passengers: "за 2 взрослых", date: "17 августа, пн" },
      { id: 13, transport: "plane", price: "от 61 792 ₽", passengers: "за 4 взрослых", date: "17 августа, пн" },
    ],
    trips: [trip(101, "bus"), trip(102, "train")],
  },
  {
    id: 2,
    title: "Новосибирск — Калининград",
    offers: [
      { id: 21, transport: "bus", price: "от 86 542 ₽", passengers: "за 4 взрослых", date: "17 августа, пн" },
      { id: 22, transport: "bus", price: "от 43 609 ₽", passengers: "за 2 взрослых", date: "17 августа, пн" },
      { id: 23, transport: "plane", price: "от 61 792 ₽", passengers: "за 4 взрослых", date: "17 августа, пн" },
    ],
    trips: [trip(201, "plane")],
  },
];

/** Вкладки раздела. Отели ждут подключения партнёра (блокер по п. 7 ТЗ). */
export const FAVORITE_TABS = [
  { value: "directions", label: "Направления" },
  { value: "trips", label: "Билеты" },
  { value: "hotels", label: "Отели" },
] as const;

export type FavoriteTab = (typeof FAVORITE_TABS)[number]["value"];

export const FAVORITE_SORTS = [
  { value: "new", label: "Сначала новые" },
  { value: "old", label: "Сначала старые" },
  { value: "cheap", label: "Сначала дешёвые" },
] as const;

export type FavoriteSort = (typeof FAVORITE_SORTS)[number]["value"];

/** Подпись-предупреждение над списком: цена в избранном не фиксируется. */
export const PRICE_NOTICE = "Цена может измениться к моменту оформления билета";

/** «от 86 542 ₽» → 86542. Нужно для сортировки по цене. */
export function favoritePriceValue(price: string): number {
  return Number(price.replace(/[^\d]/g, "")) || 0;
}
