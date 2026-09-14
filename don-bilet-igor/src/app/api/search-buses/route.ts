import { NextRequest, NextResponse } from "next/server";
import { searchRaces } from "@/lib/donbilet-api";
import { resolveCityId } from "@/lib/cities";
import type { BusResult, SearchResponse } from "@/lib/bus-search";

function isValidDate(date: string): boolean {
  return /^\d{2}\.\d{2}\.\d{4}$/.test(date.trim());
}

function parseCost(cost: string): number | null {
  const n = Number.parseFloat(cost);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fromName = searchParams.get("from") ?? "";
  const toName = searchParams.get("to") ?? "";
  const fromId = Number(searchParams.get("fromId") ?? "") || (await resolveCityId(fromName, "departure"));
  const toId = Number(searchParams.get("toId") ?? "") || (await resolveCityId(toName, "arrival", fromId ?? undefined));
  const date = searchParams.get("date") ?? "";

  if (!fromId || !toId) {
    return NextResponse.json(
      { error: "Не удалось определить города. Выберите город из подсказок." },
      { status: 400 },
    );
  }
  if (!isValidDate(date)) {
    return NextResponse.json({ error: "Некорректная дата. Ожидается формат ДД.ММ.ГГГГ." }, { status: 400 });
  }
  if (fromId === toId) {
    return NextResponse.json({ error: "Города отправления и назначения совпадают." }, { status: 400 });
  }

  try {
    const search = await searchRaces(fromId, toId, date);
    const results: BusResult[] = [...search.topRaces, ...search.races].map((r) => ({
      raceName: r.raceName,
      carrier: r.Carrier,
      depTime: r.depTime,
      arrTime: r.arrTime,
      depDate: r.depDate,
      arrDate: r.arrDate,
      tripTime: r.tripTime,
      stationDepName: r.stationDepName,
      stationArrName: r.stationArrName,
      places: r.places,
      placesColor: r.placesColor,
      cost: parseCost(r.cost),
      canBook: r.isBook === "Y",
      scheduleID: r.scheduleID,
    }));

    const body: SearchResponse = {
      results,
      nextDate: search.nextDate,
      minCost: search.minCost,
    };
    return NextResponse.json(body);
  } catch {
    return NextResponse.json(
      { error: "Сервис расписания Донбилета временно недоступен. Попробуйте ещё раз." },
      { status: 502 },
    );
  }
}
