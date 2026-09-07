/**
 * Парсит JWT-style TTL ('15m', '4h', '7d', '60s', '3600') в секунды.
 * Безопасный fallback на дефолт при пустой/некорректной строке.
 */
export function parseDurationSeconds(value: string | undefined, fallbackSeconds: number): number {
  if (!value) return fallbackSeconds;
  const trimmed = value.trim();
  if (!trimmed) return fallbackSeconds;
  const m = trimmed.match(/^(\d+)\s*([smhd])?$/i);
  if (!m) {
    const asNum = Number(trimmed);
    return Number.isFinite(asNum) && asNum > 0 ? Math.floor(asNum) : fallbackSeconds;
  }
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n <= 0) return fallbackSeconds;
  const unit = (m[2] ?? 's').toLowerCase();
  switch (unit) {
    case 's':
      return n;
    case 'm':
      return n * 60;
    case 'h':
      return n * 60 * 60;
    case 'd':
      return n * 24 * 60 * 60;
    default:
      return fallbackSeconds;
  }
}

/**
 * TTL access cookie (мс). Берётся из JWT_ACCESS_EXPIRATION (env), fallback 4h.
 * Должен совпадать с lifetime access JWT, иначе:
 * - cookie короче JWT → пользователя выкидывает раньше срока,
 * - cookie длиннее JWT → cookie ещё «жива», но JWT уже невалиден → 401.
 */
export function accessCookieMaxAgeMs(): number {
  return parseDurationSeconds(process.env.JWT_ACCESS_EXPIRATION, 4 * 60 * 60) * 1000;
}

/**
 * TTL refresh cookie (мс). Берётся из JWT_REFRESH_EXPIRATION (env), fallback 7d.
 * Должен совпадать с lifetime refresh JWT (см. accessCookieMaxAgeMs).
 */
export function refreshCookieMaxAgeMs(): number {
  return parseDurationSeconds(process.env.JWT_REFRESH_EXPIRATION, 7 * 24 * 60 * 60) * 1000;
}

/**
 * Время жизни access токена в секундах — для возврата фронту в payload
 * /auth/refresh. Фронт по этому значению планирует следующий проактивный
 * refresh (~80% TTL).
 */
export function accessTokenTtlSeconds(): number {
  return parseDurationSeconds(process.env.JWT_ACCESS_EXPIRATION, 4 * 60 * 60);
}
