import { NextRequest, NextResponse } from "next/server";
import { addPassengers, type AddPassPayload } from "@/lib/donbilet-api";

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const uuid = searchParams.get("uuid") ?? "";
  if (!uuid) return NextResponse.json({ error: "Некорректный заказ." }, { status: 400 });

  let payload: AddPassPayload;
  try {
    payload = (await request.json()) as AddPassPayload;
  } catch {
    return NextResponse.json({ error: "Некорректный запрос." }, { status: 400 });
  }

  // Реальная проверка согласий — в старом коде они были захардкожены true (находка аудита).
  if (!payload.isConfirmPolicy || !payload.isConfirmPersonalData) {
    return NextResponse.json({ error: "Необходимо согласие с условиями и обработкой персональных данных." }, { status: 400 });
  }
  if (!payload.passangers?.length) {
    return NextResponse.json({ error: "Добавьте хотя бы одного пассажира." }, { status: 400 });
  }

  try {
    const r = await addPassengers(uuid, payload);
    if (r.ok) return NextResponse.json({ ok: true });
    // 422 «не удалось зарезервировать» = онлайн-бронь по рейсу отключена (isBook=N).
    if (r.status === 422) {
      return NextResponse.json(
        { error: "Онлайн-бронирование по этому рейсу сейчас недоступно (перевозчик отключил бронь)." },
        { status: 422 },
      );
    }
    return NextResponse.json({ error: "Не удалось сохранить данные пассажиров." }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Сервис Донбилета временно недоступен." }, { status: 502 });
  }
}
