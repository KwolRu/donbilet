import { publicApiClient } from "./client";
import {
  citySchema,
  searchResultSchema,
  tripDetailsSchema,
  type City,
  type SearchResult,
  type TripDetails,
  type TripSearchForm,
} from "../validators/transport";
import { z } from "zod";

/**
 * Транспортный домен: города, поиск рейсов, детали маршрута.
 *
 * Клиент — `publicApiClient`: все эти эндпоинты анонимны, 401 здесь не бывает,
 * и пытаться рефрешить токен на них не нужно.
 *
 * Ответ валидируется схемой на границе. Это не паранойя: на фазах Ф2–Ф10 данные
 * приходят через `legacy-adapter`, который нормализует `List<Map<String,Object>>`
 * из iDempiere. Если нормализация поедет, ошибка должна вылезти здесь и сразу,
 * а не превратиться в `undefined` посреди рендера.
 *
 * Модули api — чистые функции без состояния: их одинаково вызывают и серверные
 * компоненты (SSR публичных страниц), и сторы на клиенте.
 */

const citiesSchema = z.array(citySchema);

/** Города отправления. Legacy: `GET /departures`. */
export async function fetchDepartureCities(): Promise<City[]> {
  const res = await publicApiClient.get("/transport/cities/departures");
  return citiesSchema.parse(res.data);
}

/**
 * Города прибытия для выбранного отправления.
 * Legacy: `GET /arrivals?departure=`.
 */
export async function fetchArrivalCities(departureCityId: number): Promise<City[]> {
  const res = await publicApiClient.get("/transport/cities/arrivals", {
    params: { departureCityId },
  });
  return citiesSchema.parse(res.data);
}

/**
 * Поиск рейсов. Legacy: `GET /search?departure=&arrival=&date=&person=&carrier=`.
 *
 * `date` — ISO `YYYY-MM-DD`. Приведение к legacy-формату `DD.MM.YYYY` делает адаптер.
 */
export async function searchTrips(params: TripSearchForm): Promise<SearchResult> {
  const res = await publicApiClient.get("/transport/search", {
    params: {
      departureCityId: params.departureCityId,
      arrivalCityId: params.arrivalCityId,
      date: params.date,
      passengers: params.passengers,
    },
  });
  return searchResultSchema.parse(res.data);
}

/** Детали маршрута: удобства и остановки. Legacy: `GET /details?routeid=`. */
export async function fetchTripDetails(tripId: number): Promise<TripDetails> {
  const res = await publicApiClient.get(`/transport/trips/${tripId}/details`);
  return tripDetailsSchema.parse(res.data);
}
