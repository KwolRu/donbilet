/** Значения дублируют enum `TaskStatus` из Prisma-схемы. См. projects.constants.ts. */
export const TASK_STATUSES = ['todo', 'in_progress', 'done'] as const;

export type TaskStatusValue = (typeof TASK_STATUSES)[number];
