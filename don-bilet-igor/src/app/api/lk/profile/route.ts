import { NextRequest, NextResponse } from "next/server";
import { getUserInfo, editUserInfo, LkAuthError } from "@/lib/donbilet-api";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const data = await getUserInfo(session);
    return NextResponse.json({ data });
  } catch (e) {
    if (e instanceof LkAuthError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Сервис Донбилета временно недоступен." }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  // email не редактируется (по ТЗ) — принимаем только телефон и/или новый пароль.
  let body: { phone?: string; credData?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос." }, { status: 400 });
  }
  try {
    const ok = await editUserInfo(session, { phone: body.phone, credData: body.credData });
    return ok
      ? NextResponse.json({ ok: true })
      : NextResponse.json({ error: "Не удалось сохранить изменения." }, { status: 400 });
  } catch (e) {
    if (e instanceof LkAuthError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Сервис Донбилета временно недоступен." }, { status: 502 });
  }
}
