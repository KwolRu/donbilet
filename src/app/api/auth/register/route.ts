import { NextRequest, NextResponse } from "next/server";
import { register } from "@/lib/donbilet-api";

export async function POST(request: NextRequest) {
  let body: { email?: string; phone?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос." }, { status: 400 });
  }
  const email = (body.email ?? "").trim();
  const phone = (body.phone ?? "").replace(/\D/g, "");
  const password = body.password ?? "";
  if (!email || !phone || password.length < 6) {
    return NextResponse.json(
      { error: "Заполните email, телефон и пароль (от 6 символов)." },
      { status: 400 },
    );
  }
  try {
    const r = await register(email, phone, password);
    if (!r.ok) {
      return NextResponse.json(
        { error: r.message?.slice(0, 300) || "Не удалось зарегистрироваться (возможно, email уже занят)." },
        { status: r.status === 409 ? 409 : 400 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Сервис регистрации временно недоступен." }, { status: 502 });
  }
}
