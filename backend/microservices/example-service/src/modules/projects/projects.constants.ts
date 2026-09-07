/**
 * Инвариант шаблона: никаких magic strings для статусов/ролей/прав.
 * Значения дублируют enum `ProjectStatus` из Prisma-схемы, но объявлены здесь,
 * чтобы class-validator и Swagger не зависели от сгенерированного клиента.
 */
export const PROJECT_STATUSES = ['active', 'archived'] as const;

export type ProjectStatusValue = (typeof PROJECT_STATUSES)[number];
