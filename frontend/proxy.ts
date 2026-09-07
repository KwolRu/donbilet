import { NextRequest, NextResponse } from "next/server";

import { isAppRoutePath, isAuthPublicPagePath } from "./lib/routing/auth-paths";

/**
 * Next.js 16: бывший `middleware.ts`, экспорт называется `proxy`.
 *
 * Здесь только дешёвый edge-гейт: наличие cookie сессии. Никакой проверки JWT —
 * подпись валидирует gateway, дублировать секрет на фронте не нужно. Задача
 * этого слоя — не пустить неавторизованного в /app и не показывать логин тому,
 * кто уже вошёл.
 *
 * Тенант из хоста НЕ извлекается: workspace живёт в JWT (см. ADR-0002).
 */

const SESSION_COOKIE = "access_token";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Статика, ассеты и api-роуты Next — мимо.
  if (pathname.startsWith("/_next") || pathname.startsWith("/api") || pathname.includes(".")) {
    return NextResponse.next();
  }

  const hasSession = request.cookies.has(SESSION_COOKIE);

  if (isAppRoutePath(pathname) && !hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthPublicPagePath(pathname) && hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/app";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
