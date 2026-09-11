import { NextRequest, NextResponse } from "next/server";
import { suggestCities } from "@/lib/cities";

// Автоподсказки городов для формы поиска. Тянет реальный справочник Донбилета.
// Пример: /api/cities?q=вор&dir=departure  |  /api/cities?q=мос&dir=arrival&from=1084807
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const dir = searchParams.get("dir") === "arrival" ? "arrival" : "departure";
  const from = Number(searchParams.get("from") ?? "") || undefined;

  try {
    const cities = await suggestCities(q, dir, from);
    return NextResponse.json({
      cities: cities.map((c) => ({ id: c.cityID, name: c.name, region: c.regionName })),
    });
  } catch {
    return NextResponse.json({ error: "Справочник городов недоступен." }, { status: 502 });
  }
}
