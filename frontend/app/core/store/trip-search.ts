import { create } from "zustand";

import { fetchArrivalCities, fetchDepartureCities } from "../api/transport";
import {
  tripSearchFormSchema,
  type City,
  type TripSearchForm,
} from "../validators/transport";

/**
 * Состояние формы поиска рейсов.
 *
 * Стор владеет ТОЛЬКО рабочим состоянием формы: что пользователь сейчас выбирает,
 * какие города подгружены, идёт ли загрузка. Результат поиска сюда не кладётся.
 *
 * Почему так. Канонические параметры поиска живут в URL
 * (`/races?departureCityId=&arrivalCityId=&date=&passengers=`), а не в сторе:
 *   • ссылку на результаты можно переслать и открыть заново;
 *   • страница результатов рендерится на сервере — стор ей недоступен;
 *   • кнопка «назад» в браузере возвращает прежний поиск бесплатно.
 *
 * Это осознанный уход от legacy, где состояние воронки было размазано по 15
 * query-параметрам, cookies и sessionStorage одновременно (docs/04 §4.6) — и
 * именно из-за этого разросся `TokenInterceptor`.
 *
 * Форма гидратируется из URL через `hydrateFrom` на странице результатов, чтобы
 * пользователь видел в полях то же, что искал.
 */

type TripSearchState = {
  departureCityId: number | null;
  arrivalCityId: number | null;
  /** ISO `YYYY-MM-DD`. */
  date: string;
  passengers: number;

  departureCities: City[];
  arrivalCities: City[];

  isLoadingDepartureCities: boolean;
  isLoadingArrivalCities: boolean;
  /** Ошибки валидации по полям формы. */
  fieldErrors: Partial<Record<keyof TripSearchForm, string>>;

  loadDepartureCities: () => Promise<void>;
  setDepartureCity: (cityId: number | null) => Promise<void>;
  setArrivalCity: (cityId: number | null) => void;
  setDate: (date: string) => void;
  setPassengers: (count: number) => void;
  /** Меняет города местами. Список прибытия перезагружается под новое отправление. */
  swapCities: () => Promise<void>;
  hydrateFrom: (params: Partial<TripSearchForm>) => void;
  /** Валидирует форму. Возвращает параметры для URL или `null`, если есть ошибки. */
  validate: () => TripSearchForm | null;
  reset: () => void;
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

const INITIAL = {
  departureCityId: null,
  arrivalCityId: null,
  date: todayIso(),
  passengers: 1,
  departureCities: [],
  arrivalCities: [],
  isLoadingDepartureCities: false,
  isLoadingArrivalCities: false,
  fieldErrors: {},
} satisfies Partial<TripSearchState>;

export const useTripSearchStore = create<TripSearchState>((set, get) => ({
  ...INITIAL,

  loadDepartureCities: async () => {
    if (get().departureCities.length > 0 || get().isLoadingDepartureCities) return;
    set({ isLoadingDepartureCities: true });
    try {
      set({ departureCities: await fetchDepartureCities() });
    } finally {
      set({ isLoadingDepartureCities: false });
    }
  },

  setDepartureCity: async (cityId) => {
    // Список прибытия зависит от отправления: старый выбор может стать недоступен.
    set((s) => ({
      departureCityId: cityId,
      arrivalCityId: null,
      arrivalCities: [],
      fieldErrors: { ...s.fieldErrors, departureCityId: undefined, arrivalCityId: undefined },
    }));

    if (cityId === null) return;

    set({ isLoadingArrivalCities: true });
    try {
      set({ arrivalCities: await fetchArrivalCities(cityId) });
    } finally {
      set({ isLoadingArrivalCities: false });
    }
  },

  setArrivalCity: (cityId) =>
    set((s) => ({
      arrivalCityId: cityId,
      fieldErrors: { ...s.fieldErrors, arrivalCityId: undefined },
    })),

  setDate: (date) =>
    set((s) => ({ date, fieldErrors: { ...s.fieldErrors, date: undefined } })),

  setPassengers: (count) =>
    set((s) => ({
      passengers: count,
      fieldErrors: { ...s.fieldErrors, passengers: undefined },
    })),

  swapCities: async () => {
    const { departureCityId, arrivalCityId } = get();
    if (departureCityId === null || arrivalCityId === null) return;
    await get().setDepartureCity(arrivalCityId);
    get().setArrivalCity(departureCityId);
  },

  hydrateFrom: (params) => {
    set((s) => ({
      departureCityId: params.departureCityId ?? s.departureCityId,
      arrivalCityId: params.arrivalCityId ?? s.arrivalCityId,
      date: params.date ?? s.date,
      passengers: params.passengers ?? s.passengers,
      fieldErrors: {},
    }));

    if (params.departureCityId) {
      void fetchArrivalCities(params.departureCityId).then((arrivalCities) =>
        set({ arrivalCities }),
      );
    }
  },

  validate: () => {
    const { departureCityId, arrivalCityId, date, passengers } = get();
    const result = tripSearchFormSchema.safeParse({
      departureCityId,
      arrivalCityId,
      date,
      passengers,
    });

    if (result.success) {
      set({ fieldErrors: {} });
      return result.data;
    }

    const fieldErrors: Partial<Record<keyof TripSearchForm, string>> = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0] as keyof TripSearchForm | undefined;
      if (field && !fieldErrors[field]) fieldErrors[field] = issue.message;
    }
    set({ fieldErrors });
    return null;
  },

  reset: () => set({ ...INITIAL, date: todayIso() }),
}));
