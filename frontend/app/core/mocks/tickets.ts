/**
 * Мок-данные раздела «Мои билеты».
 *
 * Форма записи повторяет ожидаемый ответ API (`GET /api/tickets`): при
 * подключении стенда (блокер B1) меняется только источник.
 *
 * Суммы и составы заказов взяты из макета один в один — включая расхождение
 * между итогом и разбивкой: в Figma это витрина, а не расчёт. Считать итог из
 * строк здесь нельзя, иначе вёрстка перестанет совпадать с эталоном.
 */

export type TransportKind = "bus" | "train" | "plane";

export type TicketStatus = "unpaid" | "paid";

/** Пассажир внутри заказа: то, что печатается на билете. */
export type TicketPassenger = {
  id: number;
  name: string;
  /** «Паспорт РФ •••• 6326 · Россия · Муж · 23.03.1996» — готовая строка из API. */
  document: string;
  seat: string;
  ticketNumber: string;
  /** Со страховкой — рядом с именем встаёт значок. */
  insurance: boolean;
  /** Стоимость места: нужна при возврате, где пассажиров выбирают поштучно. */
  price: number;
};

/** Строка разбивки стоимости. `muted` — агентское вознаграждение, оно бледнее. */
export type PriceLine = {
  label: string;
  value: string;
  muted?: boolean;
};

export type TicketEndpoint = {
  /** «17 августа, пн» */
  date: string;
  /** «19:50» */
  time: string;
  city: string;
  /** «Автовокзал №2», «наб. Обводного канала, 36» — две строки из макета. */
  station: string;
  address: string;
};

export type Ticket = {
  id: number;
  status: TicketStatus;
  transport: TransportKind;
  /** Заказ или билет — в макете подпись у номера разная. */
  numberLabel: "Заказ" | "Билет";
  number: string;
  raceNumber: string;
  refundable: boolean;
  departure: TicketEndpoint;
  arrival: TicketEndpoint;
  /** «~ 1 д 4 ч 30 м в пути» */
  duration: string;
  total: string;
  priceLines: PriceLine[];
  passengers: TicketPassenger[];
  /** Осталось на оплату — «17:53». Только у неоплаченных. */
  payDeadline?: string;
  /** Оценка поездки, 1—5. `null` — поездку ещё не оценили. */
  rating?: number | null;
};

const PRICE_LINES: PriceLine[] = [
  { label: "Билет", value: "1 490 ₽ х 3" },
  { label: "Страховка", value: "199 ₽ х 2" },
  { label: "Багаж", value: "249 ₽" },
  { label: "Агентское вознаграждение", value: "129 ₽", muted: true },
];

const PASSENGERS: TicketPassenger[] = [
  {
    id: 1,
    name: "Демьяненко Константин Владимирович",
    document: "Паспорт РФ •••• 6326 · Россия · Муж · 23.03.1996",
    seat: "33",
    ticketNumber: "BN-8374-54558",
    insurance: false,
    price: 2450,
  },
  {
    id: 2,
    name: "Демьяненко Полина Александровна",
    document: "Паспорт РФ •••• 5478 · Россия · Жен · 23.03.1999",
    seat: "34",
    ticketNumber: "BN-8374-54559",
    insurance: true,
    price: 2450,
  },
  {
    id: 3,
    name: "Демьяненко Дмитрий Константинович",
    document: "Свидетельство о рождении •••• 2089 · Россия · Муж · 10.04.2020",
    seat: "35",
    ticketNumber: "BN-8374-54560",
    insurance: true,
    price: 2450,
  },
];

const SPB: TicketEndpoint = {
  date: "17 августа, пн",
  time: "19:50",
  city: "Санкт-Петербург",
  station: "Автовокзал №2",
  address: "наб. Обводного канала, 36",
};

const KRASNODAR: TicketEndpoint = {
  date: "18 августа, вт",
  time: "01:50",
  city: "Краснодар",
  station: "Автовокзал «Южный»",
  address: "ул. Береговая, 1А",
};

/** Предстоящие поездки — вкладка по умолчанию. */
export const MOCK_UPCOMING_TICKETS: Ticket[] = [
  {
    id: 1,
    status: "unpaid",
    transport: "bus",
    numberLabel: "Заказ",
    number: "DB-845732",
    raceNumber: "№ LX-423",
    refundable: false,
    departure: SPB,
    arrival: KRASNODAR,
    duration: "~ 1 д 4 ч 30 м в пути",
    total: "6 870 ₽",
    priceLines: PRICE_LINES,
    passengers: PASSENGERS,
    payDeadline: "17:53",
  },
  {
    id: 2,
    status: "paid",
    transport: "train",
    numberLabel: "Заказ",
    number: "DB-845732",
    raceNumber: "№ LX-423",
    refundable: false,
    departure: { ...SPB, city: "Калининград" },
    arrival: { ...KRASNODAR, city: "Владивосток" },
    duration: "~ 1 д 4 ч 30 м в пути",
    total: "54 940 ₽",
    priceLines: PRICE_LINES,
    passengers: PASSENGERS,
  },
  {
    id: 3,
    status: "paid",
    transport: "bus",
    numberLabel: "Билет",
    number: "BN-8374-54558",
    raceNumber: "№ LX-423",
    refundable: false,
    departure: { ...SPB, city: "Казань" },
    arrival: { ...KRASNODAR, city: "Воронеж" },
    duration: "~ 1 д 4 ч 30 м в пути",
    total: "9 800 ₽",
    priceLines: PRICE_LINES,
    passengers: PASSENGERS,
  },
];

/**
 * Завершённые поездки. Первая раскрыта карточкой, остальные — строками:
 * так в макете, и это разумно — детали прошлой поездки нужны редко.
 */
export const MOCK_COMPLETED_TICKETS: Ticket[] = [
  {
    id: 11,
    status: "paid",
    transport: "bus",
    numberLabel: "Заказ",
    number: "DB-845732",
    raceNumber: "№ LX-423",
    refundable: false,
    departure: { ...SPB, city: "Казань" },
    arrival: { ...KRASNODAR, city: "Воронеж" },
    duration: "~ 1 д 4 ч 30 м в пути",
    total: "9 800 ₽",
    priceLines: PRICE_LINES.slice(0, 3),
    passengers: PASSENGERS,
    rating: 4,
  },
  ...Array.from({ length: 6 }, (_, index) => ({
    id: 12 + index,
    status: "paid" as const,
    transport: (index % 3 === 2 ? "plane" : "bus") as TransportKind,
    numberLabel: "Заказ" as const,
    number: "DB-845732",
    raceNumber: "№ LX-423",
    refundable: false,
    departure: SPB,
    arrival: KRASNODAR,
    duration: "~ 1 д 4 ч 30 м в пути",
    total: "6 870 ₽",
    priceLines: PRICE_LINES.slice(0, 3),
    passengers: PASSENGERS,
    // Первая строка без оценки: в макете у неё кнопка «Оцените поездку».
    rating: index === 0 ? null : 4,
  })),
];

/** Фильтр по виду транспорта над списком. */
export const TRANSPORT_FILTERS = [
  { value: "all", label: "Все" },
  { value: "bus", label: "Автобус" },
  { value: "plane", label: "Самолет" },
] as const;

export type TransportFilter = (typeof TRANSPORT_FILTERS)[number]["value"];

/** Порядок сортировки списка. */
export const TICKET_SORTS = [
  { value: "new", label: "Сначала новые" },
  { value: "old", label: "Сначала старые" },
  { value: "price", label: "Сначала дорогие" },
] as const;

export type TicketSort = (typeof TICKET_SORTS)[number]["value"];

/**
 * Критерии оценки поездки. Названия в макете обезличены («Критерий 01») —
 * их состав придёт от заказчика вместе с API отзывов, поэтому здесь они
 * оставлены как есть, чтобы не выдумывать формулировки.
 */
export const RATING_CRITERIA = [
  { id: "criteria-1", label: "Критерий 01" },
  { id: "criteria-2", label: "Критерий 02" },
  { id: "criteria-3", label: "Критерий 03" },
  { id: "criteria-4", label: "Критерий 04" },
] as const;

/** Текст подсказки про удержание перевозчика — из макета, со ссылкой на закон. */
export const REFUND_FEE_HINT =
  "Удержание рассчитывается по ст. 23 ФЗ № 259-ФЗ: 5% — при возврате более чем " +
  "за 2 часа до отправления, 15% — менее чем за 2 часа, 25% — при опоздании на рейс.";

/** Денежный формат макета: разряды узким пробелом, знак рубля через пробел. */
export function formatPrice(value: number): string {
  return `${value.toLocaleString("ru-RU").replace(/ /g, " ")} ₽`;
}

/** «3 пасс» — краткая подпись свёрнутого блока пассажиров. */
export function passengersSummary(ticket: Ticket): string {
  return `${ticket.passengers.length} пасс`;
}

/** «33, 34 и 35 места» — перечисление мест через запятую с «и» перед последним. */
export function seatsSummary(ticket: Ticket): string {
  const seats = ticket.passengers.map((passenger) => passenger.seat);
  if (seats.length === 0) return "места не выбраны";
  if (seats.length === 1) return `${seats[0]} место`;

  return `${seats.slice(0, -1).join(", ")} и ${seats[seats.length - 1]} места`;
}
