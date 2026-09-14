/**
 * Мок экрана оформления заказа.
 *
 * Структура повторяет данные, которые позже придут из адаптера DonBilet:
 * рейс, доступность мест и готовая разбивка цены. До снятия блокера B1
 * экран работает на этих данных по решению R12.
 */

export type OrderEndpoint = {
  time: string;
  date: string;
  city: string;
  station: string;
  address: string;
};

export type OrderPriceLine = {
  label: string;
  value: string;
  muted?: boolean;
};

export type OrderSeatCell = number | "unavailable" | null;

export type OrderMock = {
  reviews: number;
  rating: number;
  departure: OrderEndpoint;
  arrival: OrderEndpoint;
  duration: string;
  passengerCount: number;
  initialSeats: number[];
  total: string;
  priceLines: OrderPriceLine[];
  passengerStepTotal: string;
  passengerStepPriceLines: OrderPriceLine[];
  seatColumns: OrderSeatCell[][];
};

export const MOCK_ORDER: OrderMock = {
  reviews: 736,
  rating: 4.8,
  departure: {
    time: "19:50",
    date: "17 августа, пн",
    city: "Санкт-Петербург",
    station: "Автовокзал №2",
    address: "наб. Обводного канала, 36",
  },
  arrival: {
    time: "01:50",
    date: "18 августа, вт",
    city: "Краснодар",
    station: "Автовокзал «Южный»",
    address: "ул. Береговая, 1А",
  },
  duration: "8 ч 30 м в пути",
  passengerCount: 3,
  initialSeats: [25, 29, 30],
  total: "3 854 ₽",
  priceLines: [
    { label: "Стоимость взрослого билета", value: "1 490 ₽ х 2" },
    { label: "Стоимость детского билета", value: "745 ₽" },
    { label: "Агентское вознаграждение", value: "129 ₽", muted: true },
  ],
  passengerStepTotal: "5 875 ₽",
  passengerStepPriceLines: [
    { label: "Стоимость взрослого билета", value: "1 490 ₽ х 2" },
    { label: "Стоимость детского билета", value: "745 ₽" },
    { label: "Страховка", value: "349 ₽ х 2" },
    { label: "Багаж", value: "289 ₽ х 3" },
    { label: "Агентское вознаграждение", value: "129 ₽", muted: true },
  ],
  // Автобус в макете расположен горизонтально: каждая внутренняя группа —
  // вертикальная колонка мест, null оставляет проход, unavailable — штриховку.
  seatColumns: [
    [41, "unavailable", "unavailable", 44, 45],
    [37, 38, null, 39, 40],
    [33, 34, null, "unavailable", "unavailable"],
    [29, 30, null, 31, 32],
    [25, 26, null, 27, 28],
    [23, 24, null, null, null],
    [21, 22, null, null, null],
    [17, 18, null, 19, "unavailable"],
    [13, 14, null, 15, 16],
    [9, 10, null, "unavailable", "unavailable"],
    [5, 6, null, 7, 8],
    [1, "unavailable", null, 3, 4],
  ],
};
