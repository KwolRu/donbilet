import { NextRequest, NextResponse } from "next/server";
import { login } from "@/lib/donbilet-api";
import { setSession } from "@/lib/session";

export async function POST(request: NextRequest) {
  let body: { loginName?: string; credData?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос." }, { status: 400 });
  }
  const loginName = (body.loginName ?? "").trim();
  const credData = body.credData ?? "";
  if (!loginName || !credData) {
    return NextResponse.json({ error: "Укажите email и пароль." }, { status: 400 });
  }

  try {
    const session = await login(loginName, credData);
    if (!session) {
      return NextResponse.json({ error: "Неверный email или пароль." }, { status: 401 });
    }
    await setSession(session);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Сервис авторизации временно недоступен." }, { status: 502 });
  }
}
