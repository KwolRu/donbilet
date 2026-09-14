import { NextRequest, NextResponse } from "next/server";
import { startReturn, LkAuthError } from "@/lib/donbilet-api";
import { getSession } from "@/lib/session";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  let body: { ticketId?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос." }, { status: 400 });
  }
  if (!body.ticketId) return NextResponse.json({ error: "Не указан билет." }, { status: 400 });
  try {
    const ok = await startReturn(session, body.ticketId);
    return ok
      ? NextResponse.json({ ok: true })
      : NextResponse.json({ error: "Не удалось оформить возврат." }, { status: 400 });
  } catch (e) {
    if (e instanceof LkAuthError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Сервис Донбилета временно недоступен." }, { status: 502 });
  }
}
