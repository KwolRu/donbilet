import { create } from "zustand";

import { MOCK_ORDER, type OrderPassengerExtras } from "../mocks/order";

export type SeatSelectionMode = "automatic" | "list";
export type OrderCheckoutStep = "seats" | "passengers" | "payment" | "success";

export const ORDER_MIN_PASSENGERS = 1;
export const ORDER_MAX_PASSENGERS = 10;

const AVAILABLE_SEATS = MOCK_ORDER.seatColumns
  .flat()
  .filter((seat): seat is number => typeof seat === "number");

function automaticSeats(count: number): number[] {
  const preferred = [
    ...MOCK_ORDER.initialSeats,
    ...AVAILABLE_SEATS.filter((seat) => !MOCK_ORDER.initialSeats.includes(seat)),
  ];

  return preferred.slice(0, count).sort((a, b) => a - b);
}

type OrderState = {
  checkoutStep: OrderCheckoutStep;
  mode: SeatSelectionMode;
  passengerCount: number;
  selectedSeats: number[];
  passengerExtras: OrderPassengerExtras[];
  goToPassengers: () => void;
  goToPayment: () => void;
  completeOrder: () => void;
  setMode: (mode: SeatSelectionMode) => void;
  setPassengerCount: (count: number) => void;
  setPassengerExtras: (index: number, extras: OrderPassengerExtras) => void;
  toggleSeat: (seat: number) => void;
  reset: () => void;
};

const INITIAL = {
  checkoutStep: "seats" as const,
  mode: "list" as const,
  passengerCount: MOCK_ORDER.passengerCount,
  selectedSeats: MOCK_ORDER.initialSeats,
  passengerExtras: Array.from({ length: ORDER_MAX_PASSENGERS }, (_, index) =>
    index === 0
      ? { insurance: false, baggageCount: 2 }
      : index === 1
        ? { insurance: true, baggageCount: 0 }
        : index === 2
          ? { insurance: true, baggageCount: 1 }
          : { insurance: false, baggageCount: 0 },
  ),
};

/**
 * Клиентское состояние текущего шага оформления.
 *
 * Пока backend не подключён, стор отвечает только за способ выбора, количество
 * пассажиров и номера мест. Позже сюда не нужно переносить данные рейса и цену:
 * они приходят из API заказа и остаются серверными данными.
 */
export const useOrderStore = create<OrderState>((set) => ({
  ...INITIAL,

  goToPassengers: () =>
    set((state) =>
      state.selectedSeats.length > 0 && state.selectedSeats.length === state.passengerCount
        ? { checkoutStep: "passengers" }
        : state,
    ),

  goToPayment: () => set({ checkoutStep: "payment" }),

  completeOrder: () => set({ checkoutStep: "success" }),

  setMode: (mode) =>
    set((state) => {
      if (mode === "automatic") {
        const passengerCount = Math.max(ORDER_MIN_PASSENGERS, state.passengerCount);
        return {
          mode,
          passengerCount,
          // Имитируем ответ будущего API: сначала берём места из эталонного
          // кадра, затем дополняем доступными местами схемы.
          selectedSeats: automaticSeats(passengerCount),
        };
      }

      // В ручном режиме число пассажиров определяется выбранными местами.
      return { mode, passengerCount: 0, selectedSeats: [] };
    }),

  setPassengerCount: (count) =>
    set((state) => {
      const passengerCount = Math.min(
        ORDER_MAX_PASSENGERS,
        Math.max(ORDER_MIN_PASSENGERS, count),
      );

      return {
        passengerCount,
        selectedSeats:
          state.mode === "automatic"
            ? automaticSeats(passengerCount)
            : state.selectedSeats.slice(0, passengerCount),
      };
    }),

  setPassengerExtras: (index, extras) =>
    set((state) => ({
      passengerExtras: state.passengerExtras.map((item, itemIndex) =>
        itemIndex === index ? extras : item,
      ),
    })),

  toggleSeat: (seat) =>
    set((state) => {
      if (state.mode !== "list") return state;

      if (state.selectedSeats.includes(seat)) {
        const selectedSeats = state.selectedSeats.filter((value) => value !== seat);
        return { selectedSeats, passengerCount: selectedSeats.length };
      }

      if (state.selectedSeats.length >= ORDER_MAX_PASSENGERS) return state;

      const selectedSeats = [...state.selectedSeats, seat].sort((a, b) => a - b);
      return { selectedSeats, passengerCount: selectedSeats.length };
    }),

  reset: () => set(INITIAL),
}));
