import { NextRequest, NextResponse } from "next/server";
import { startTicket } from "@/lib/donbilet-api";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const scheduleId = Number(searchParams.get("scheduleid") ?? "");
  const person = Math.min(Math.max(Number(searchParams.get("person") ?? "1"), 1), 10);
  if (!scheduleId) return NextResponse.json({ error: "Не указан рейс." }, { status: 400 });
  try {
    const order = await startTicket(scheduleId, person);
    if (!order) return NextResponse.json({ error: "Не удалось начать оформление (нет мест или рейс недоступен)." }, { status: 409 });
    return NextResponse.json({ data: order });
  } catch {
    return NextResponse.json({ error: "Сервис Донбилета временно недоступен." }, { status: 502 });
  }
}
