// Резолв городов против боевого справочника Донбилета (WSv2 /departures, /arrivals).
// Кешируется в памяти процесса, чтобы не дергать боевой сервер на каждый запрос.
import { getArrivals, getDepartures, type City } from "./donbilet-api";

let departuresCache: { at: number; data: City[] } | null = null;
const arrivalsCache = new Map<number, { at: number; data: City[] }>();
const TTL = 1000 * 60 * 30; // 30 минут

export async function loadDepartures(): Promise<City[]> {
  if (departuresCache && Date.now() - departuresCache.at < TTL) return departuresCache.data;
  const data = await getDepartures();
  departuresCache = { at: Date.now(), data };
  return data;
}

export async function loadArrivals(departureCityId: number): Promise<City[]> {
  const cached = arrivalsCache.get(departureCityId);
  if (cached && Date.now() - cached.at < TTL) return cached.data;
  const data = await getArrivals(departureCityId);
  arrivalsCache.set(departureCityId, { at: Date.now(), data });
  return data;
}

function norm(s: string): string {
  return s.trim().toLowerCase().replace(/ё/g, "е");
}

/** Находит cityID по названию. direction определяет справочник. */
export async function resolveCityId(
  name: string,
  direction: "departure" | "arrival",
  departureCityId?: number,
): Promise<number | null> {
  const q = norm(name);
  if (!q) return null;
  const list =
    direction === "arrival" && departureCityId ? await loadArrivals(departureCityId) : await loadDepartures();

  const exact = list.find((c) => norm(c.name) === q);
  if (exact) return exact.cityID;
  const starts = list.find((c) => norm(c.name).startsWith(q));
  return starts ? starts.cityID : null;
}

/** Подсказки для автокомплита. */
export async function suggestCities(
  query: string,
  direction: "departure" | "arrival",
  departureCityId?: number,
  limit = 8,
): Promise<City[]> {
  const q = norm(query);
  const list =
    direction === "arrival" && departureCityId ? await loadArrivals(departureCityId) : await loadDepartures();
  if (!q) return list.slice(0, limit);
  const starts = list.filter((c) => norm(c.name).startsWith(q));
  const contains = list.filter((c) => !norm(c.name).startsWith(q) && norm(c.name).includes(q));
  return [...starts, ...contains].slice(0, limit);
}
