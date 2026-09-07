/**
 * ШАБЛОН схемы. Копировать в `app/core/validators/<resource>.ts`.
 *
 * Это ИСТОЧНИК ПРАВДЫ о форме данных и о доменных константах фронта.
 * Типы — производные через z.infer, а не написанные рядом: иначе тип и проверка
 * расходятся, и TypeScript начинает врать.
 */

import { z } from "zod";

// ── Доменные константы живут здесь и переиспользуются api/стором/UI ────────────
export const FEATURE_STATUSES = ["draft", "active", "archived"] as const;
export type FeatureStatus = (typeof FEATURE_STATUSES)[number];

// ── Схема ОТВЕТА СЕРВЕРА (фактического, а не желаемого) ───────────────────────
export const featureSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  status: z.enum(FEATURE_STATUSES),
  // Даты — строкой. z.coerce.date() ломает сериализацию в стор и сравнение в тестах;
  // преобразование делать в месте отображения.
  createdAt: z.string(),
  updatedAt: z.string().nullable(),
});
export type FeatureRow = z.infer<typeof featureSchema>;

export const featureListSchema = z.object({
  items: z.array(featureSchema),
  // Форма ответа списка одинакова во всех доменных модулях шаблона
  // (см. ProjectListResponseDto в example-service) — не изобретайте свою.
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
});
export type FeatureList = z.infer<typeof featureListSchema>;

// ── UI-метаданные: подписи и оформление статусов рядом с самим списком ────────
// Так добавление статуса не забывается в интерфейсе.
export const FEATURE_STATUS_META: Record<FeatureStatus, { label: string; tone: "muted" | "accent" | "warn" }> = {
  draft: { label: "Черновик", tone: "muted" },
  active: { label: "Активна", tone: "accent" },
  archived: { label: "В архиве", tone: "warn" },
};

/**
 * Схема ФОРМЫ (то, что вводит пользователь) — отдельно от схемы ответа.
 * Их совмещение приводит к тому, что серверные поля (id, createdAt) становятся
 * «обязательными» в форме создания.
 */
export const createFeatureFormSchema = z.object({
  name: z.string().trim().min(1, "Укажите название").max(200, "Слишком длинное название"),
});
export type CreateFeatureForm = z.infer<typeof createFeatureFormSchema>;
