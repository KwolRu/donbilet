/**
 * База URL публичного API для браузера и SSR.
 * - Если задан NEXT_PUBLIC_API_URL — всегда он (прямой вызов gateway с хоста).
 * - Иначе в браузере — same-origin (Traefik на том же host:port проксирует /api → gateway).
 * - Иначе на сервере Next — INTERNAL_API_URL (docker-сеть) или fallback localhost.
 */
export function getPublicApiBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (typeof window !== "undefined") {
    const browserHost = window.location.hostname.split(":")[0];
    const browserOnLocalhost =
      browserHost === "localhost" || browserHost === "127.0.0.1" || browserHost === "::1";
    // Host-based dev: при поддоменах школы предпочитаем same-origin,
    // иначе cookies auth между frontend и /api теряются из-за cross-site localhost:5000.
    if (!browserOnLocalhost) {
      return window.location.origin;
    }
    if (fromEnv) return fromEnv;
    return window.location.origin;
  }

  if (fromEnv) return fromEnv;

  const internal = process.env.INTERNAL_API_URL?.trim();
  if (internal) return internal;

  return "http://localhost:5200";
}
