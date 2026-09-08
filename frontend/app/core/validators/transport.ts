import { z } from "zod";

/**
 * Схемы транспортного домена: города, рейсы, поиск.
 *
 * Это КОНТРАКТ, который обязан отдавать gateway. На фазе Ф2 его реализует
 * `legacy-adapter` поверх iDempiere `/WSv2`, на фазе Ф11 — `transport-service`.
 * Фронт ни в одной из фаз не меняется: форма ответа здесь одна и та же.
 *
 * Отличия от legacy-контракта — сознательные, менять обратно нельзя:
 *   • Ответ — объект, а не массив разнородных элементов `[{races,topraces},{mincost,nextdate}]`.
 *     Legacy заставлял клиента разбирать результат по индексам (docs/03 §3.1).
 *   • Дата — ISO `YYYY-MM-DD`, а не `DD.MM.YYYY`. Приведение — в адаптере.
 *   • Ни `apikey`, ни `apitoken` в запросах нет. Учётные данные к перевозчикам
 *     живут на сервере; legacy отдавал их браузеру (docs/07, S2/S3).
 *   • Деньги — целые копейки, а не число с плавающей точкой.
 */

/** Город отправления или прибытия. */
export const citySchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  regionName: z.string().nullish(),
  countryName: z.string().nullish(),
});

export type City = z.infer<typeof citySchema>;

/** Станция (автовокзал, остановочный пункт). */
export const stationSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  address: z.string().nullish(),
});

export type Station = z.infer<typeof stationSchema>;

/**
 * Маркетинговая плашка на карточке рейса.
 * В legacy — объект `ads` с цветами и логотипом; контент задаётся оператором в CRM.
 */
export const tripBadgeSchema = z.object({
  text: z.string(),
  textColor: z.string().nullish(),
  backgroundColor: z.string().nullish(),
  logoUrl: z.string().nullish(),
});

/**
 * Рейс в результатах поиска.
 *
 * `departureAt` / `arrivalAt` — ISO 8601 с таймзоной. Legacy отдавал дату и время
 * раздельными строками плюс unix-таймстамп плюс «сортировочное» число; вся эта
 * тройка схлопывается в одно поле, из которого клиент считает и отображение, и сортировку.
 */
export const tripSchema = z.object({
  id: z.number().int().positive(),
  scheduleId: z.number().int().positive(),

  departureAt: z.iso.datetime({ offset: true }),
  arrivalAt: z.iso.datetime({ offset: true }),
  /** Длительность в минутах. */
  durationMinutes: z.number().int().nonnegative(),

  departureCity: z.string(),
  arrivalCity: z.string(),
  departureStation: stationSchema,
  arrivalStation: stationSchema,

  carrierName: z.string(),
  routeNumber: z.string().nullish(),
  routeName: z.string().nullish(),

  /** Цены в копейках. */
  priceMinor: z.number().int().nonnegative(),
  childPriceMinor: z.number().int().nonnegative().nullish(),
  baggagePriceMinor: z.number().int().nonnegative().nullish(),

  seatsAvailable: z.number().int().nonnegative(),
  /** Есть ли графическая схема салона — от этого зависит шаг выбора места. */
  hasSeatMap: z.boolean(),
  canBuyBaggage: z.boolean(),
  isETicket: z.boolean(),

  badge: tripBadgeSchema.nullish(),
});

export type Trip = z.infer<typeof tripSchema>;

/**
 * Результат поиска.
 *
 * `nextAvailableDate` — ближайшая дата с рейсами, если на запрошенную ничего нет.
 * Legacy отдавал её вторым элементом массива вместе с `mincost`.
 */
export const searchResultSchema = z.object({
  trips: z.array(tripSchema),
  /** Рекомендованные рейсы, показываются над основным списком. */
  topTrips: z.array(tripSchema),
  minPriceMinor: z.number().int().nonnegative().nullable(),
  nextAvailableDate: z.iso.date().nullable(),
});

export type SearchResult = z.infer<typeof searchResultSchema>;

/** Детали маршрута: удобства и промежуточные остановки. */
export const routeStopSchema = z.object({
  stationName: z.string(),
  cityName: z.string(),
  arrivalAt: z.iso.datetime({ offset: true }).nullish(),
  departureAt: z.iso.datetime({ offset: true }).nullish(),
});

export const tripDetailsSchema = z.object({
  carrierName: z.string(),
  amenities: z.object({
    wifi: z.boolean(),
    airConditioning: z.boolean(),
    video: z.boolean(),
    seatbelts: z.boolean(),
    comfort: z.boolean(),
  }),
  stops: z.array(routeStopSchema),
});

export type TripDetails = z.infer<typeof tripDetailsSchema>;

// ─── Форма поиска ─────────────────────────────────────────────────────────────

/** Горизонт поиска. В legacy захардкожен в `SearchService`: 61 день. */
export const SEARCH_MAX_DAYS_AHEAD = 61;
export const SEARCH_MAX_PASSENGERS = 10;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function maxSearchDateIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + SEARCH_MAX_DAYS_AHEAD);
  return d.toISOString().slice(0, 10);
}

/**
 * Валидация формы поиска на клиенте.
 *
 * Границы продублированы на бэкенде: клиентская проверка нужна для мгновенной
 * обратной связи, а не вместо серверной.
 */
export const tripSearchFormSchema = z
  .object({
    departureCityId: z.number().int().positive({ error: "Выберите город отправления" }),
    arrivalCityId: z.number().int().positive({ error: "Выберите город прибытия" }),
    date: z.iso.date({ error: "Выберите дату поездки" }),
    passengers: z
      .number()
      .int()
      .min(1, { error: "Минимум один пассажир" })
      .max(SEARCH_MAX_PASSENGERS, {
        error: `Максимум ${SEARCH_MAX_PASSENGERS} пассажиров в одном заказе`,
      }),
  })
  .refine((v) => v.departureCityId !== v.arrivalCityId, {
    error: "Города отправления и прибытия должны отличаться",
    path: ["arrivalCityId"],
  })
  .refine((v) => v.date >= todayIso(), {
    error: "Дата поездки не может быть в прошлом",
    path: ["date"],
  })
  .refine((v) => v.date <= maxSearchDateIso(), {
    error: `Билеты продаются не более чем за ${SEARCH_MAX_DAYS_AHEAD} дней`,
    path: ["date"],
  });

export type TripSearchForm = z.infer<typeof tripSearchFormSchema>;
