/**
 * ШАБЛОН api-клиента. Копировать в `app/core/api/<resource>.ts` вместе со схемой
 * (assets/validator.ts) и, при необходимости, стором (assets/store.ts).
 *
 * ИНВАРИАНТЫ:
 *  - используем общий `apiClient` из `app/core/api/client.ts`: в нём живут
 *    baseURL, withCredentials и единый refresh с mutex/cooldown. Свой fetch
 *    означает свой (сломанный) refresh;
 *  - ответ ПАРСИТСЯ схемой, а не приводится типом: бэкенд меняется, и лучше
 *    упасть на границе с понятной ошибкой, чем отрисовать undefined;
 *  - workspaceId не передаётся — тенант берётся из JWT на бэкенде;
 *  - api-клиент не знает про UI: ни тостов, ни редиректов. Ошибку обрабатывает стор.
 */

import { apiClient } from "./client";
import {
  featureListSchema,
  featureSchema,
  type FeatureList,
  type FeatureRow,
} from "../validators/feature";

/**
 * Приводит ошибку axios к сообщению для пользователя.
 *
 * 401 здесь НЕ обрабатывается: интерцептор `apiClient` уже попытался обновить
 * сессию и повторить запрос. Если 401 долетел сюда — сессия действительно мертва.
 */
function toUserMessage(error: unknown): string {
  const err = error as {
    response?: { status?: number; data?: { message?: string; error?: string } };
    message?: string;
  };

  const status = err.response?.status;
  const payload = err.response?.data;

  if (status === 401) return "Сессия истекла — войдите заново";
  if (status === 403) return payload?.message || "Действие запрещено";
  if (status === 404) return payload?.message || "Не найдено";
  if (status === 409) return payload?.message || "Конфликт: объект уже изменён";
  if (status === 429) return "Слишком много запросов, попробуйте позже";
  if (status === 502 || status === 503) return "Сервис временно недоступен";

  return payload?.message || payload?.error || err.message || "Произошла ошибка";
}

/** Обёртка, чтобы каждый метод не повторял try/catch. */
async function request<T>(fn: () => Promise<{ data: unknown }>, parse: (raw: unknown) => T): Promise<T> {
  try {
    const { data } = await fn();
    return parse(data);
  } catch (error) {
    throw new Error(toUserMessage(error));
  }
}

export interface ListFeatureParams {
  status?: string[];
  search?: string;
  page?: number;
  limit?: number;
}

export function listFeatures(params: ListFeatureParams = {}): Promise<FeatureList> {
  return request(
    () => apiClient.get("/features", { params }),
    (raw) => featureListSchema.parse(raw),
  );
}

export function getFeature(id: string): Promise<FeatureRow> {
  return request(
    () => apiClient.get(`/features/${id}`),
    (raw) => featureSchema.parse(raw),
  );
}

export function createFeature(input: { name: string }): Promise<FeatureRow> {
  return request(
    () => apiClient.post("/features", input),
    (raw) => featureSchema.parse(raw),
  );
}

export function updateFeature(id: string, input: { name?: string }): Promise<FeatureRow> {
  return request(
    () => apiClient.patch(`/features/${id}`, input),
    (raw) => featureSchema.parse(raw),
  );
}

export async function deleteFeature(id: string): Promise<void> {
  try {
    await apiClient.delete(`/features/${id}`);
  } catch (error) {
    throw new Error(toUserMessage(error));
  }
}

/**
 * Необратимое действие. `idempotencyKey` формирует ВЫЗЫВАЮЩИЙ, детерминированно
 * по бизнес-смыслу операции. Случайный ключ на каждый клик означает, что двойной
 * клик даст два эффекта — то есть идемпотентности нет.
 */
export function executeFeature(id: string, idempotencyKey: string): Promise<FeatureRow> {
  return request(
    () => apiClient.post(`/features/${id}/execute`, {}, { headers: { "Idempotency-Key": idempotencyKey } }),
    (raw) => featureSchema.parse(raw),
  );
}
