import { create } from "zustand";

import { MOCK_ORDER } from "../mocks/order";

export type SeatSelectionMode = "automatic" | "list";
export type OrderCheckoutStep = "seats" | "passengers" | "payment";

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
  goToPassengers: () => void;
  goToPayment: () => void;
  setMode: (mode: SeatSelectionMode) => void;
  setPassengerCount: (count: number) => void;
  toggleSeat: (seat: number) => void;
  reset: () => void;
};

const INITIAL = {
  checkoutStep: "seats" as const,
  mode: "list" as const,
  passengerCount: MOCK_ORDER.passengerCount,
  selectedSeats: MOCK_ORDER.initialSeats,
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
      state.selectedSeats.length === state.passengerCount
        ? { checkoutStep: "passengers" }
        : state,
    ),

  goToPayment: () => set({ checkoutStep: "payment" }),

  setMode: (mode) =>
    set((state) => ({
      mode,
      // В автоматическом режиме имитируем ответ будущего API: сначала берём
      // места из эталонного кадра, затем дополняем доступными местами схемы.
      selectedSeats: mode === "automatic" ? automaticSeats(state.passengerCount) : state.selectedSeats,
    })),

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

  toggleSeat: (seat) =>
    set((state) => {
      if (state.mode !== "list") return state;

      if (state.selectedSeats.includes(seat)) {
        return { selectedSeats: state.selectedSeats.filter((value) => value !== seat) };
      }

      if (state.selectedSeats.length >= state.passengerCount) return state;

      return { selectedSeats: [...state.selectedSeats, seat].sort((a, b) => a - b) };
    }),

  reset: () => set(INITIAL),
}));
