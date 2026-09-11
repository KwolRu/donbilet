import { cookies } from "next/headers";
import type { Session } from "./donbilet-api";

// Наша httpOnly-кука хранит сессию Донбилета: "JSESSIONID::crfs-token".
// В браузер значение не отдаётся кодом страниц — только на сервере.
const COOKIE = "db_session";

export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const raw = store.get(COOKIE)?.value;
  if (!raw) return null;
  const [jsessionid, token] = raw.split("::");
  return jsessionid && token ? { jsessionid, token } : null;
}

export async function setSession(session: Session): Promise<void> {
  const store = await cookies();
  store.set(COOKIE, `${session.jsessionid}::${session.token}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 часов
  });
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
}
