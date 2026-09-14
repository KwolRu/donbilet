import { PUBLIC_ROUTES } from "./public-paths";
import { SEARCH_MAX_PASSENGERS } from "@app/core/validators/transport";

export const RACES_TRANSPORTS = ["bus", "plane", "train", "hotel"] as const;

export type RacesTransport = (typeof RACES_TRANSPORTS)[number];

export type RacesSearchQuery = {
  departureCityId?: number;
  arrivalCityId?: number;
  date?: string;
  passengers?: number;
  transport?: RacesTransport;
};

type SearchParams = Record<string, string | string[] | undefined>;

/** Дата для URL в локальном календарном дне, без UTC-сдвига около полуночи. */
export function formatSearchDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function searchDateAfter(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return formatSearchDate(date);
}

/** Канонический URL выдачи — один генератор для Hero и карточек направлений. */
export function buildRacesHref({
  departureCityId,
  arrivalCityId,
  date,
  passengers,
  transport = "bus",
}: Required<Omit<RacesSearchQuery, "transport">> & { transport?: RacesTransport }): string {
  const query = new URLSearchParams({
    departureCityId: String(departureCityId),
    arrivalCityId: String(arrivalCityId),
    date,
    passengers: String(passengers),
    transport,
  });

  return `${PUBLIC_ROUTES.search}?${query.toString()}`;
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function positiveInteger(value: string | undefined): number | undefined {
  if (!value || !/^\d+$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function passengerCount(value: string | undefined): number | undefined {
  const parsed = positiveInteger(value);
  return parsed && parsed <= SEARCH_MAX_PASSENGERS ? parsed : undefined;
}

/** Безопасно читает query App Router: неизвестные и некорректные значения отбрасывает. */
export function parseRacesSearchParams(params: SearchParams): RacesSearchQuery {
  const date = first(params.date);
  const transport = first(params.transport);

  return {
    departureCityId: positiveInteger(first(params.departureCityId)),
    arrivalCityId: positiveInteger(first(params.arrivalCityId)),
    date: date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined,
    passengers: passengerCount(first(params.passengers)),
    transport: RACES_TRANSPORTS.includes(transport as RacesTransport)
      ? (transport as RacesTransport)
      : undefined,
  };
}
