import { NextResponse } from "next/server";
import { getMyHistory, LkAuthError } from "@/lib/donbilet-api";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const data = await getMyHistory(session);
    return NextResponse.json({ data });
  } catch (e) {
    if (e instanceof LkAuthError) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Сервис Донбилета временно недоступен." }, { status: 502 });
  }
}
