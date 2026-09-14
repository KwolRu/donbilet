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

export type OrderPassengerExtras = {
  insurance: boolean;
  baggageCount: number;
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
  seatColumns: OrderSeatCell[][];
};

const ADULT_TICKET_PRICE = 1490;
const CHILD_TICKET_PRICE = 745;
const AGENCY_FEE = 129;
const INSURANCE_PRICE = 389;
const BAGGAGE_PRICE = 289;

function formatRubles(value: number): string {
  return `${new Intl.NumberFormat("ru-RU").format(value)} ₽`;
}

/**
 * Предварительный расчёт до ввода данных пассажиров.
 * В демо-заказе первые два пассажира взрослые, третий — ребёнок; все
 * добавленные сверх них считаются взрослыми до подключения тарифного API.
 */
export function getSeatSelectionPrice(selectedSeatCount: number): {
  total: string;
  lines: OrderPriceLine[];
} {
  const count = Math.max(0, selectedSeatCount);
  const childCount = count >= 3 ? 1 : 0;
  const adultCount = count - childCount;
  const total = adultCount * ADULT_TICKET_PRICE + childCount * CHILD_TICKET_PRICE + (count > 0 ? AGENCY_FEE : 0);
  const lines: OrderPriceLine[] = [];

  if (adultCount > 0) {
    lines.push({
      label: "Стоимость взрослого билета",
      value:
        adultCount > 1
          ? `${formatRubles(ADULT_TICKET_PRICE)} х ${adultCount}`
          : formatRubles(ADULT_TICKET_PRICE),
    });
  }
  if (childCount > 0) {
    lines.push({ label: "Стоимость детского билета", value: formatRubles(CHILD_TICKET_PRICE) });
  }
  if (count > 0) {
    lines.push({ label: "Агентское вознаграждение", value: formatRubles(AGENCY_FEE), muted: true });
  }

  return { total: formatRubles(total), lines };
}

/** Итог для шагов пассажиров и оплаты с выбранными допуслугами. */
export function getOrderPrice(
  passengerCount: number,
  extras: OrderPassengerExtras[],
): { total: string; lines: OrderPriceLine[] } {
  const base = getSeatSelectionPrice(passengerCount);
  const activeExtras = extras.slice(0, passengerCount);
  const insuranceCount = activeExtras.filter((item) => item.insurance).length;
  const baggageCount = activeExtras.reduce((sum, item) => sum + item.baggageCount, 0);
  const extrasTotal = insuranceCount * INSURANCE_PRICE + baggageCount * BAGGAGE_PRICE;
  const lines = [...base.lines];
  const fee = lines.pop();

  if (insuranceCount > 0) {
    lines.push({
      label: "Страховка",
      value:
        insuranceCount > 1
          ? `${formatRubles(INSURANCE_PRICE)} х ${insuranceCount}`
          : formatRubles(INSURANCE_PRICE),
    });
  }
  if (baggageCount > 0) {
    lines.push({
      label: "Багаж",
      value:
        baggageCount > 1
          ? `${formatRubles(BAGGAGE_PRICE)} х ${baggageCount}`
          : formatRubles(BAGGAGE_PRICE),
    });
  }
  if (fee) lines.push(fee);

  const baseTotal = Number(base.total.replace(/\D/g, ""));
  return { total: formatRubles(baseTotal + extrasTotal), lines };
}

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
