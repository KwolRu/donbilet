import { NextRequest, NextResponse } from "next/server";
import { buyOrder } from "@/lib/donbilet-api";

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const orderId = Number(searchParams.get("orderid") ?? "");
  if (!orderId) return NextResponse.json({ error: "Некорректный заказ." }, { status: 400 });
  try {
    const result = await buyOrder(orderId);
    if (!result) return NextResponse.json({ error: "Не удалось инициировать оплату." }, { status: 400 });
    // Возвращаем handoff на Payler. Само проведение платежа — на стороне Payler.
    return NextResponse.json({ data: result });
  } catch {
    return NextResponse.json({ error: "Платёжный сервис временно недоступен." }, { status: 502 });
  }
}
