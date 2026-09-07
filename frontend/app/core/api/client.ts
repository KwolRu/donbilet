import axios, { type InternalAxiosRequestConfig } from "axios";

import { getPublicApiBaseUrl } from "../../../lib/env/api-public-base";
import { isAuthPublicPagePath } from "../../../lib/routing/auth-paths";
import { applyBrowserServerErrorPolicy } from "../../../lib/routing/server-error-browser";

/**
 * Единый HTTP-клиент приложения.
 *
 * Тенант НЕ передаётся заголовком и не берётся из поддомена: backend читает
 * `workspace_id` из проверенного JWT (см. ADR-0002). Поэтому клиенту достаточно
 * `withCredentials: true` — httpOnly-cookies с access/refresh делают всё остальное.
 *
 * Что здесь решено раз и навсегда, чтобы не переписывать в каждом проекте:
 *   • baseURL вычисляется в рантайме (same-origin через nginx / прямой gateway);
 *   • refresh — один на всё приложение, с mutex'ом и cooldown'ом, поэтому
 *     параллельные 401 не устраивают каскад и не съедают one-time refresh-токен;
 *   • cross-tab синхронизация refresh через BroadcastChannel;
 *   • проактивный refresh за ~80% TTL — снимает 401 после долгого простоя.
 */

function applyDynamicApiBaseUrl(config: { baseURL?: string }) {
  const base = getPublicApiBaseUrl().replace(/\/$/, "");
  config.baseURL = `${base}/api`;
}

export const refreshClient = axios.create({
  headers: { "Content-Type": "application/json; charset=utf-8" },
  withCredentials: true,
});

export function isAuthPage(): boolean {
  if (typeof window === "undefined") return false;
  return isAuthPublicPagePath(window.location.pathname);
}

refreshClient.interceptors.request.use((config) => {
  applyDynamicApiBaseUrl(config);
  return config;
});

refreshClient.interceptors.response.use(
  (response) => response,
  (error) => {
    applyBrowserServerErrorPolicy(error, REFRESH_ENDPOINT);
    return Promise.reject(error);
  },
);

const REFRESH_ENDPOINT = "/auth/refresh";

type RetryableConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

/** Маркер активной сессии. Ставится стором авторизации после логина. */
const SESSION_MARKER_KEY = "session";

function hasActiveSession(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return Boolean(window.localStorage.getItem(SESSION_MARKER_KEY));
  } catch {
    return false;
  }
}

/**
 * lastSuccessAtMs — время последнего УСПЕШНОГО refresh (в этой вкладке либо
 * полученное из BroadcastChannel от другой). Работает как cooldown: если refresh
 * только что прошёл, повторный 401 в течение REFRESH_COOLDOWN_MS переиспользует
 * свежие cookies вместо нового сетевого вызова.
 */
const refreshState: { inFlight: Promise<void> | null; lastSuccessAtMs: number } = {
  inFlight: null,
  lastSuccessAtMs: 0,
};

const REFRESH_COOLDOWN_MS = 5_000;
const BROADCAST_CHANNEL_NAME = "app:auth-refresh";

type RefreshMessage =
  | { type: "refresh:start"; at: number }
  | { type: "refresh:success"; at: number; expiresIn?: number }
  | { type: "refresh:fail"; at: number };

let refreshChannel: BroadcastChannel | null = null;

function getRefreshChannel(): BroadcastChannel | null {
  if (typeof window === "undefined") return null;
  if (typeof BroadcastChannel === "undefined") return null;
  if (refreshChannel) return refreshChannel;
  try {
    refreshChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
    refreshChannel.onmessage = (ev: MessageEvent<RefreshMessage>) => {
      const msg = ev.data;
      if (!msg || msg.type !== "refresh:success") return;
      // Соседняя вкладка только что прокрутила refresh — не дёргаем свой.
      refreshState.lastSuccessAtMs = Math.max(refreshState.lastSuccessAtMs, msg.at);
      if (typeof msg.expiresIn === "number" && msg.expiresIn > 0) {
        schedulePreemptiveRefresh(msg.expiresIn);
      }
    };
  } catch {
    refreshChannel = null;
  }
  return refreshChannel;
}

function broadcastRefresh(msg: RefreshMessage) {
  const ch = getRefreshChannel();
  if (!ch) return;
  try {
    ch.postMessage(msg);
  } catch {
    /* ignore */
  }
}

async function runRefresh(): Promise<void> {
  if (refreshState.inFlight) return refreshState.inFlight;

  if (Date.now() - refreshState.lastSuccessAtMs < REFRESH_COOLDOWN_MS) {
    return;
  }

  broadcastRefresh({ type: "refresh:start", at: Date.now() });

  refreshState.inFlight = refreshClient
    .post(REFRESH_ENDPOINT, {})
    .then((res) => {
      const at = Date.now();
      refreshState.lastSuccessAtMs = at;
      const expiresIn = (res?.data as { data?: { expiresIn?: number } } | undefined)?.data
        ?.expiresIn;
      broadcastRefresh({ type: "refresh:success", at, expiresIn });
      if (typeof expiresIn === "number" && expiresIn > 0) {
        schedulePreemptiveRefresh(expiresIn);
      }
      return undefined;
    })
    .catch((err) => {
      broadcastRefresh({ type: "refresh:fail", at: Date.now() });
      throw err;
    })
    .finally(() => {
      refreshState.inFlight = null;
    });

  return refreshState.inFlight;
}

/**
 * Проактивный refresh за ~80% TTL access-токена. Убирает основной сценарий 401
 * в фоне: пользователь долго не делает HTTP-запросов (открыт WS/вкладка простаивает),
 * access-cookie тихо истекает, и первое же действие ловит 401.
 */
const PRE_REFRESH_RATIO = 0.8;
const MIN_PRE_REFRESH_MS = 30_000;
/** Совпадает с дефолтом JWT_ACCESS_EXPIRATION на бэкенде. */
const DEFAULT_ACCESS_TTL_SEC = 4 * 60 * 60;

let preemptiveTimer: ReturnType<typeof setTimeout> | null = null;

function schedulePreemptiveRefresh(expiresInSec: number) {
  if (typeof window === "undefined") return;
  const delay = Math.max(MIN_PRE_REFRESH_MS, Math.floor(expiresInSec * 1000 * PRE_REFRESH_RATIO));
  if (preemptiveTimer) clearTimeout(preemptiveTimer);
  preemptiveTimer = setTimeout(() => {
    if (!hasActiveSession()) return;
    runRefresh().catch(() => {
      // refresh упал — следующий 401 дёрнет интерсептор; здесь молча.
    });
  }, delay);
}

/** Вызывается один раз на старте приложения (клиентский bootstrap-компонент). */
export function bootstrapPreemptiveRefresh() {
  if (typeof window === "undefined") return;
  getRefreshChannel();
  if (hasActiveSession()) {
    schedulePreemptiveRefresh(DEFAULT_ACCESS_TTL_SEC);
  }
}

/** `none` — клиент для публичных эндпоинтов: 401 не пытается рефрешить. */
type RefreshMode = "auto" | "none";

function createApiClient(refreshMode: RefreshMode) {
  const client = axios.create({
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
    withCredentials: true,
  });

  client.interceptors.request.use((config) => {
    applyDynamicApiBaseUrl(config);

    // FormData: boundary проставляет браузер, наш Content-Type его сломает.
    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    }

    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config as RetryableConfig | undefined;
      applyBrowserServerErrorPolicy(error, originalRequest?.url);

      if (!originalRequest) {
        return Promise.reject(error);
      }

      // 401 от самих auth-эндпоинтов рефрешить бессмысленно — это и есть провал входа.
      const requestUrl = originalRequest.url ?? "";
      const isAuthEndpoint = requestUrl.includes("/auth/");

      if (
        error.response?.status === 401 &&
        !originalRequest._retry &&
        !isAuthEndpoint &&
        !isAuthPage() &&
        refreshMode !== "none"
      ) {
        originalRequest._retry = true;
        try {
          await runRefresh();
          return client(originalRequest);
        } catch (refreshError) {
          return Promise.reject(refreshError);
        }
      }

      error.message = error.response?.data?.message || error.message || "Произошла ошибка";
      return Promise.reject(error);
    },
  );

  return client;
}

/** Основной клиент: используется всеми api-модулями приложения. */
export const apiClient = createApiClient("auto");

/** Для публичных эндпоинтов (лендинг, формы без авторизации). */
export const publicApiClient = createApiClient("none");
