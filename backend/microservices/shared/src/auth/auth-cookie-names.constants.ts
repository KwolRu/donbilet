/**
 * Имена сессионных cookie. Единственный источник правды для бэкенда и фронта:
 * `frontend/proxy.ts` проверяет наличие `access_token`, чтобы решить, пускать ли
 * в защищённую зону. Переименовали здесь — переименуйте и там.
 *
 * Обе cookie httpOnly: JS их не читает, поэтому XSS не уводит сессию.
 */
export const AUTH_COOKIE_NAMES = {
  access: 'access_token',
  refresh: 'refresh_token',
} as const;

export type AuthAccessCookieName = typeof AUTH_COOKIE_NAMES.access;
