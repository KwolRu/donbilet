import { NextRequest, NextResponse } from "next/server";
import { getOrderInfo } from "@/lib/donbilet-api";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const uuid = searchParams.get("uuid") ?? "";
  const orderId = Number(searchParams.get("orderid") ?? "");
  if (!uuid || !orderId) return NextResponse.json({ error: "Некорректный заказ." }, { status: 400 });
  try {
    const info = await getOrderInfo(uuid, orderId);
    if (!info) return NextResponse.json({ error: "Заказ не найден или истёк." }, { status: 404 });
    return NextResponse.json({ data: info });
  } catch {
    return NextResponse.json({ error: "Сервис Донбилета временно недоступен." }, { status: 502 });
  }
}
