/**
 * Мок-данные страницы поиска рейсов.
 *
 * Форма записи повторяет ожидаемый ответ API (`GET /api/search`): при
 * подключении стенда (блокер B1) меняется только источник.
 *
 * Цены и время намеренно одинаковые у всех рейсов — так в макете. Витрина
 * проверяет раскладку и поведение, а не арифметику: придумывать разброс
 * значит расходиться с эталоном при сверке.
 */

import type { TransportKind } from "./tickets";

/** Вкладка транспорта над выдачей: своя цена «от» у каждой. */
export type TransportTab = {
  value: TransportKind | "hotel";
  label: string;
  price: string;
};

export const TRANSPORT_TABS: TransportTab[] = [
  { value: "bus", label: "Автобус", price: "от 5 343 ₽" },
  { value: "plane", label: "Авиабилеты", price: "от 36 278 ₽" },
  { value: "train", label: "Поезда", price: "от 14 502 ₽" },
  { value: "hotel", label: "Отели", price: "от 9 680 ₽" },
];

/**
 * Столбец календаря цен. `price` пустой — цены нет, в макете там лупа:
 * дату можно открыть поиском, но заранее она не посчитана.
 */
export type PriceColumn = {
  id: string;
  range: string;
  price: string | null;
  /** Цена заметно ниже прочих — показывается зелёным. */
  cheap?: boolean;
};

export const PRICE_COLUMNS: PriceColumn[] = [
  { id: "1", range: "3 сен - 4 сен", price: "5 343 ₽" },
  { id: "2", range: "4 сен - 6 сен", price: "2 687 ₽", cheap: true },
  { id: "3", range: "8 сен - 10 сен", price: null },
  { id: "4", range: "12 сен - 16 сен", price: null },
  { id: "5", range: "17 сен - 19 сен", price: "6 872 ₽" },
  { id: "6", range: "22 сен - 26 сен", price: "6 414 ₽" },
  { id: "7", range: "29 сен - 1 окт", price: "2 569 ₽", cheap: true },
  { id: "8", range: "3 окт - 5 окт", price: null },
  { id: "9", range: "7 окт - 9 окт", price: "7 254 ₽" },
  { id: "10", range: "12 окт - 14 окт", price: "6 940 ₽" },
  { id: "11", range: "18 окт - 20 окт", price: "3 120 ₽", cheap: true },
  { id: "12", range: "24 окт - 26 окт", price: null },
];

/** Быстрые фильтры-чипы над выдачей. */
export const QUICK_FILTERS = [
  { value: "baggage", label: "Только с багажом" },
  { value: "no-transfer", label: "Без пересадки" },
  { value: "direct", label: "Только прямые" },
] as const;

export type QuickFilter = (typeof QUICK_FILTERS)[number]["value"];

export const SEARCH_SORTS = [
  { value: "cheap", label: "Сначала дешевые" },
  { value: "fast", label: "Сначала быстрые" },
  { value: "early", label: "Раньше отправление" },
] as const;

export type SearchSort = (typeof SEARCH_SORTS)[number]["value"];

/** Сколько карточек показывать за раз. */
export const PAGE_SIZES = [
  { value: "20", label: "Показывать по 20" },
  { value: "50", label: "Показывать по 50" },
  { value: "100", label: "Показывать по 100" },
] as const;

/** Удобства в рейсе — иконки под расписанием. Имена совпадают с lucide. */
export const AMENITIES = [
  { id: "air", label: "Кондиционер" },
  { id: "wifi", label: "Wi-Fi" },
  { id: "tv", label: "Телевизор" },
  { id: "toilet", label: "Туалет" },
  { id: "night", label: "Ночной рейс" },
  { id: "coffee", label: "Кофе" },
  { id: "music", label: "Музыка" },
  { id: "socket", label: "Розетки" },
] as const;

export type AmenityId = (typeof AMENITIES)[number]["id"];

export type TripEndpoint = {
  time: string;
  date: string;
  city: string;
  station: string;
  address: string;
};

export type SearchTrip = {
  id: number;
  transport: TransportKind;
  carrier: string;
  rating: number;
  reviews: number;
  price: string;
  /** «За десятерых» — подпись под ценой. */
  priceNote: string;
  /** «37 осталось» — свободные места. */
  seatsLeft: number;
  refundable: boolean;
  /** Прямой рейс, с багажом и т.д. — по этим полям работают быстрые фильтры. */
  direct: boolean;
  baggage: boolean;
  transfers: number;
  duration: string;
  departure: TripEndpoint;
  arrival: TripEndpoint;
  amenities: AmenityId[];
  /** Уже в избранном. */
  favorite: boolean;
  /**
   * Рейс отмечен как выгодный — зелёная метка у левого края карточки.
   * Признак приходит от API вместе с рейсом: это решение сервиса о цене
   * относительно соседних вариантов, а не оформление.
   */
  highlighted: boolean;
};

const SPB: TripEndpoint = {
  time: "19:50",
  date: "17 августа, пн",
  city: "Санкт-Петербург",
  station: "Автовокзал №2",
  address: "наб. Обводного канала, 36",
};

const KRASNODAR: TripEndpoint = {
  time: "01:50",
  date: "18 августа, вт",
  city: "Краснодар",
  station: "Автовокзал «Южный»",
  address: "ул. Береговая, 1А",
};

const ALL_AMENITIES: AmenityId[] = AMENITIES.map((item) => item.id);

export const MOCK_TRIPS: SearchTrip[] = Array.from({ length: 12 }, (_, index) => ({
  id: index + 1,
  transport: (index % 5 === 4 ? "train" : index % 7 === 6 ? "plane" : "bus") as TransportKind,
  carrier: "ТФ Движение-2000",
  rating: 4.8,
  reviews: 736,
  price: "6 870 ₽",
  priceNote: "За десятерых",
  seatsLeft: 37 - index,
  refundable: false,
  direct: index % 3 !== 1,
  baggage: index % 2 === 0,
  transfers: index % 3 === 1 ? 1 : 0,
  duration: "~ 1 д 4 ч 30 м в пути",
  departure: SPB,
  arrival: KRASNODAR,
  amenities: ALL_AMENITIES.slice(0, 8 - (index % 3)),
  favorite: index % 4 === 0,
  highlighted: index % 5 === 1,
}));

/** Сколько рейсов «нашлось» — в макете это число не равно длине списка. */
export const FOUND_TRIPS = 56;

/** Карточка жилья в подборке под выдачей. */
export type HotelOffer = {
  id: number;
  name: string;
  kind: string;
  stars: number;
  rating: number;
  price: string;
  photo: 1 | 2 | 3 | 4 | 5 | 6;
};

export const MOCK_HOTELS: HotelOffer[] = [
  { id: 1, name: "Rodina Residences Vladivostok", kind: "Отель", stars: 4, rating: 4.8, price: "6 870 ₽", photo: 1 },
  { id: 2, name: "Гостиница «Вилла АртЭ»", kind: "Отель", stars: 4, rating: 4.7, price: "6 870 ₽", photo: 2 },
  { id: 3, name: "Версаль", kind: "Отель", stars: 4, rating: 4.9, price: "6 870 ₽", photo: 3 },
  { id: 4, name: "AZIMUT Сити Отель Владивосток", kind: "Отель", stars: 4, rating: 5.0, price: "6 870 ₽", photo: 4 },
  { id: 5, name: "VLADIVOSTOK Grand Hotel & SPA", kind: "Отель", stars: 4, rating: 4.9, price: "6 870 ₽", photo: 5 },
  { id: 6, name: "Приморье Delux", kind: "Отель", stars: 4, rating: 4.6, price: "6 870 ₽", photo: 6 },
];

/** Секции подробного фильтра в боковой панели. */
export const FILTER_SECTIONS = [
  {
    id: "baggage",
    title: "Багаж",
    options: [
      { value: "10", label: "от 10 кг", price: "от 16 510 ₽" },
      { value: "20", label: "от 20 кг", price: "от 18 497 ₽" },
      { value: "30", label: "от 30 кг", price: "от 21 372 ₽" },
    ],
  },
  {
    id: "time",
    title: "Время отправления",
    options: [
      { value: "morning", label: "Утро, 06:00 — 12:00", price: "от 16 510 ₽" },
      { value: "day", label: "День, 12:00 — 18:00", price: "от 18 497 ₽" },
      { value: "night", label: "Ночь, 18:00 — 06:00", price: "от 21 372 ₽" },
    ],
  },
  {
    id: "carrier",
    title: "Перевозчик",
    options: [
      { value: "dvizhenie", label: "ТФ Движение-2000", price: "от 16 510 ₽" },
      { value: "yug", label: "Юг-Экспресс", price: "от 18 497 ₽" },
      { value: "don", label: "ДонАвтоТранс", price: "от 21 372 ₽" },
    ],
  },
] as const;

export type FilterSectionId = (typeof FILTER_SECTIONS)[number]["id"];

/** «6 870 ₽» → 6870. Для сортировки по цене. */
export function tripPriceValue(price: string): number {
  return Number(price.replace(/[^\d]/g, "")) || 0;
}
