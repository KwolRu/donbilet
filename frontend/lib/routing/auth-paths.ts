/**
 * Публичные auth-маршруты приложения.
 *
 * Единственный источник правды о том, какие страницы доступны без сессии.
 * Используется и в `proxy.ts` (гейт на входе), и в API-клиенте (не рефрешить
 * токен на странице логина). Добавили страницу входа — добавьте её сюда,
 * иначе она либо не откроется, либо будет ловить лишние refresh-запросы.
 */

export const AUTH_PUBLIC_PAGE_PREFIXES = [
  "/login",
  "/register",
  "/invite",
  "/forgot-password",
  "/reset-password",
  "/password-success",
] as const;

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isAuthPublicPagePath(pathname: string): boolean {
  return AUTH_PUBLIC_PAGE_PREFIXES.some((p) => matchesPrefix(pathname, p));
}

/**
 * Полностью публичные разделы (лендинг, оферта, публичные формы).
 * Всё, что не попало ни сюда, ни в AUTH_PUBLIC_PAGE_PREFIXES, считается
 * защищённым и требует сессии.
 */
export const PUBLIC_ROUTE_PREFIXES = ["/", "/legal"] as const;

export function isPublicRoutePath(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_ROUTE_PREFIXES.some((p) => p !== "/" && matchesPrefix(pathname, p));
}

/** Защищённая зона приложения. */
export const APP_ROUTE_PREFIXES = ["/app"] as const;

export function isAppRoutePath(pathname: string): boolean {
  return APP_ROUTE_PREFIXES.some((p) => matchesPrefix(pathname, p));
}
