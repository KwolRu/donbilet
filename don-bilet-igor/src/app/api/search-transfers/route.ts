import { NextRequest, NextResponse } from "next/server";
import { searchConnections } from "@/lib/donbilet-api";

function isValidDate(date: string): boolean {
  return /^\d{2}\.\d{2}\.\d{4}$/.test(date.trim());
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fromId = Number(searchParams.get("fromId") ?? "");
  const toId = Number(searchParams.get("toId") ?? "");
  const date = searchParams.get("date") ?? "";

  if (!fromId || !toId) return NextResponse.json({ error: "Не указаны города." }, { status: 400 });
  if (!isValidDate(date)) return NextResponse.json({ error: "Некорректная дата." }, { status: 400 });
  if (fromId === toId) return NextResponse.json({ error: "Города совпадают." }, { status: 400 });

  try {
    const options = await searchConnections(fromId, toId, date);
    return NextResponse.json({ options });
  } catch {
    return NextResponse.json({ error: "Сервис расписания временно недоступен." }, { status: 502 });
  }
}
