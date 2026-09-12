import { NextRequest, NextResponse } from "next/server";

import { isAppRoutePath, isAuthPublicPagePath } from "./lib/routing/auth-paths";
import { ACCOUNT_ROUTES, isAccountPath } from "./lib/routing/public-paths";

/**
 * Next.js 16: бывший `middleware.ts`, экспорт называется `proxy`.
 *
 * Здесь только дешёвый edge-гейт: наличие cookie сессии. Никакой проверки JWT —
 * подпись валидирует gateway, дублировать секрет на фронте не нужно. Задача
 * этого слоя — не пустить неавторизованного в закрытые зоны и не показывать
 * логин тому, кто уже вошёл.
 *
 * Две закрытые зоны с разной природой субъекта (см. ADR-0006):
 *   `/profile` — личный кабинет покупателя;
 *   `/app`     — CRM оператора.
 * Различение по ролям делает gateway; здесь только факт наличия сессии.
 *
 * Публичный сайт (главная, поиск, воронка покупки) сессии не требует:
 * купить билет можно без регистрации — ТЗ п. 2.10.
 */

const SESSION_COOKIE = "access_token";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Статика, ассеты и api-роуты Next — мимо.
  if (pathname.startsWith("/_next") || pathname.startsWith("/api") || pathname.includes(".")) {
    return NextResponse.next();
  }

  const hasSession = request.cookies.has(SESSION_COOKIE);

  if (isAccountPath(pathname) && !hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  if (isAppRoutePath(pathname) && !hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthPublicPagePath(pathname) && hasSession) {
    const url = request.nextUrl.clone();

    /*
     * Вошедшего уводим туда, откуда его сюда прислали (`?from=`), иначе — в
     * личный кабинет покупателя. Раньше здесь стоял `/app` — раздел CRM
     * оператора, которого ещё нет: любой заход на `/login` с живой сессией
     * заканчивался страницей 404.
     *
     * `from` берём только для собственных путей приложения: внешний адрес в
     * этом параметре превратил бы вход в открытый редиректор на чужой сайт.
     */
    const from = request.nextUrl.searchParams.get("from");
    const safeFrom = from && from.startsWith("/") && !from.startsWith("//") ? from : null;

    url.pathname = safeFrom ?? ACCOUNT_ROUTES.root;
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
