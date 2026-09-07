/**
 * ШАБЛОН: ядро конфигурации AI-слоя — маршруты, промпты, журнал, bootstrap.
 *
 * FRAMEWORK-AGNOSTIC (принимает клиент ORM аргументом), поэтому одинаково используется
 * DI-сервисом, сидом и приёмочным скриптом. Это не стилевое решение: приёмка должна
 * дёргать ТУ ЖЕ логику, что и рантайм, иначе она проверяет другой код.
 *
 * ГЛАВНЫЙ ИНВАРИАНТ: resolveModelAlias возвращает ЛОГИЧЕСКИЙ алиас, НИКОГДА физический
 * model ID. Физический ID появляется лишь в recordExecution как постфактум-наблюдаемость.
 */

import type { PrismaClient } from '@prisma/client';

// ── Доменные ошибки (обёртка маппит в HTTP, скрипт ловит по instanceof) ─────────
export class UnknownModelAliasError extends Error {
  constructor(public readonly alias: string) {
    super(`Unknown or disabled model alias: "${alias}"`);
    this.name = 'UnknownModelAliasError';
  }
}
export class UnknownUseCaseError extends Error {
  constructor(public readonly useCase: string, public readonly workspaceId: string | null) {
    super(`No active routing policy for use case "${useCase}" (workspace=${workspaceId ?? 'platform'})`);
    this.name = 'UnknownUseCaseError';
  }
}
export class PromptNotFoundError extends Error {
  constructor(public readonly key: string) {
    super(`No prompt template found for key "${key}"`);
    this.name = 'PromptNotFoundError';
  }
}

// ═══════════════════════════ МАРШРУТИЗАЦИЯ ═══════════════════════════

/** Алиас обязан существовать в реестре и быть включён. Дублирует FK в БД намеренно:
 *  сервисная проверка даёт внятную ошибку, FK защищает от гонок и ручных правок. */
export async function assertKnownAlias(prisma: PrismaClient, alias: string): Promise<void> {
  const model = await prisma.aiModel.findUnique({ where: { alias } });
  if (!model || !model.isEnabled) throw new UnknownModelAliasError(alias);
}

/** use case → алиас. Порядок: тенантное переопределение → платформенный дефолт → ОШИБКА.
 *  Молчаливый дефолт запрещён: он маскирует незарегистрированный use case. */
export async function resolveModelAlias(
  prisma: PrismaClient,
  useCase: string,
  workspaceId?: string | null,
): Promise<string> {
  if (workspaceId) {
    const tenant = await prisma.aiRoutingPolicy.findFirst({ where: { workspaceId, useCase, isActive: true } });
    if (tenant) {
      await assertKnownAlias(prisma, tenant.modelAlias);
      return tenant.modelAlias;
    }
  }
  const platform = await prisma.aiRoutingPolicy.findFirst({ where: { workspaceId: null, useCase, isActive: true } });
  if (!platform) throw new UnknownUseCaseError(useCase, workspaceId ?? null);
  await assertKnownAlias(prisma, platform.modelAlias);
  return platform.modelAlias;
}

/** Создать/обновить маршрут. Неизвестный алиас отклоняется ДО записи. */
export async function upsertRoutingPolicy(
  prisma: PrismaClient,
  params: { workspaceId?: string | null; useCase: string; modelAlias: string; description?: string },
): Promise<void> {
  const workspaceId = params.workspaceId ?? null;
  await assertKnownAlias(prisma, params.modelAlias);
  const existing = await prisma.aiRoutingPolicy.findFirst({ where: { workspaceId, useCase: params.useCase } });
  if (existing) {
    await prisma.aiRoutingPolicy.update({
      where: { id: existing.id },
      data: { modelAlias: params.modelAlias, description: params.description, isActive: true },
    });
  } else {
    await prisma.aiRoutingPolicy.create({
      data: { workspaceId, useCase: params.useCase, modelAlias: params.modelAlias, description: params.description },
    });
  }
}

// ═══════════════════════════ РЕЕСТР ПРОМПТОВ ═══════════════════════════

/** Активный промпт с fallback тенант → платформа. СИММЕТРИЧНО resolveModelAlias:
 *  разная логика fallback даёт непротестированные комбинации. */
export async function resolveActivePrompt(prisma: PrismaClient, key: string, workspaceId?: string | null) {
  if (workspaceId) {
    const tenant = await prisma.promptTemplate.findFirst({ where: { workspaceId, key, status: 'active' } });
    if (tenant) return tenant;
  }
  const platform = await prisma.promptTemplate.findFirst({ where: { workspaceId: null, key, status: 'active' } });
  if (!platform) throw new PromptNotFoundError(key);
  return platform;
}

/** Новая версия — ИММУТАБЕЛЬНЫЙ append. Существующие версии не трогаются никогда. */
export async function createPromptVersion(
  prisma: PrismaClient,
  params: { key: string; content: string; workspaceId?: string | null; variablesSchema?: Record<string, unknown>; activate?: boolean },
) {
  const workspaceId = params.workspaceId ?? null;
  const agg = await prisma.promptTemplate.aggregate({ where: { workspaceId, key: params.key }, _max: { version: true } });
  const nextVersion = (agg._max.version ?? 0) + 1;

  const created = await prisma.promptTemplate.create({
    data: {
      workspaceId, key: params.key, version: nextVersion, status: 'draft',
      content: params.content, variablesSchema: params.variablesSchema as object | undefined,
    },
  });
  if (params.activate) {
    await activatePromptVersion(prisma, { key: params.key, version: nextVersion, workspaceId });
    return prisma.promptTemplate.findUniqueOrThrow({ where: { id: created.id } });
  }
  return created;
}

/** Переключение активной версии — в ТРАНЗАКЦИИ.
 *  Детерминированность (≤1 active) гарантируется частичным UNIQUE в БД:
 *  UNIQUE (workspace_id, key) WHERE status = 'active'.
 *  Не полагаться на «мы всегда аккуратно активируем». */
export async function activatePromptVersion(
  prisma: PrismaClient,
  params: { key: string; version: number; workspaceId?: string | null },
) {
  const workspaceId = params.workspaceId ?? null;
  await prisma.$transaction(async (tx) => {
    await tx.promptTemplate.updateMany({
      where: { workspaceId, key: params.key, status: 'active' },
      data: { status: 'archived' },
    });
    const target = await tx.promptTemplate.findFirst({ where: { workspaceId, key: params.key, version: params.version } });
    if (!target) throw new PromptNotFoundError(`${params.key}@v${params.version}`);
    await tx.promptTemplate.update({ where: { id: target.id }, data: { status: 'active' } });
  });
}

// ═══════════════════════════ ЖУРНАЛ ВЫПОЛНЕНИЙ ═══════════════════════════

/** Идемпотентная запись по idempotency_key: повтор не создаёт дубль.
 *  Вызывается ДВАЖДЫ за задачу: status='running' до вызова модели, затем финальный статус. */
export async function recordExecution(
  prisma: PrismaClient,
  params: {
    workspaceId: string;
    taskType: string;
    idempotencyKey: string;
    correlationId?: string;
    modelAlias?: string;          // ЛОГИЧЕСКИЙ алиас
    promptKey?: string;
    promptVersion?: number;
    status?: string;              // pending | running | completed | failed | needs_review
    // Постфактум-наблюдаемость (из ответа шлюза):
    provider?: string;
    model?: string;               // ФИЗИЧЕСКАЯ модель — не алиас!
    promptTokens?: number;
    completionTokens?: number;
    costUsd?: number;
    latencyMs?: number;
    attempts?: number;
    /** Результат задачи — без него идемпотентность вырождается в «мы помним, что это было». */
    storedResult?: unknown;
    /** Версии знаний/контекста, на которых получен результат. */
    knowledgeVersions?: unknown;
    guardrailsPassed?: boolean;
  },
) {
  return prisma.aiTaskExecution.upsert({
    where: { idempotencyKey: params.idempotencyKey },
    create: {
      workspaceId: params.workspaceId, taskType: params.taskType,
      idempotencyKey: params.idempotencyKey, correlationId: params.correlationId,
      modelAlias: params.modelAlias, promptKey: params.promptKey, promptVersion: params.promptVersion,
      status: params.status ?? 'pending',
      provider: params.provider, model: params.model,
      promptTokens: params.promptTokens, completionTokens: params.completionTokens,
      costUsd: params.costUsd, latencyMs: params.latencyMs, attempts: params.attempts ?? 0,
      storedResult: params.storedResult as object | undefined,
      knowledgeVersions: params.knowledgeVersions as object | undefined,
      guardrailsPassed: params.guardrailsPassed,
    },
    // Повтор по тому же ключу — no-op по бизнес-полям; обновляем только наблюдаемость.
    update: {
      status: params.status, provider: params.provider, model: params.model,
      promptTokens: params.promptTokens, completionTokens: params.completionTokens,
      costUsd: params.costUsd, latencyMs: params.latencyMs, attempts: params.attempts,
      storedResult: params.storedResult as object | undefined,
      knowledgeVersions: params.knowledgeVersions as object | undefined,
      guardrailsPassed: params.guardrailsPassed,
    },
  });
}

// ═══════════════════════════ BOOTSTRAP ═══════════════════════════

/**
 * Идемпотентный посев минимальной AI-конфигурации: провайдер (проекция для UI) +
 * алиасы моделей + платформенные маршруты + seed-промпты (active v1).
 * Повторный вызов НИЧЕГО не дублирует и не плодит версий промптов.
 */
export async function bootstrapAiConfig(
  prisma: PrismaClient,
  cfg: {
    provider: { slug: string; label: string };
    models: Array<{ alias: string; role: string; supportsTools: boolean; supportsStructuredOutput: boolean; description?: string }>;
    policies: Array<{ useCase: string; modelAlias: string; description?: string }>;
    prompts: Array<{ key: string; content: string; variablesSchema?: Record<string, unknown> }>;
  },
) {
  const provider = await prisma.aiProvider.upsert({
    where: { slug: cfg.provider.slug },
    update: { label: cfg.provider.label, isEnabled: true },
    create: { slug: cfg.provider.slug, label: cfg.provider.label },
  });

  for (const m of cfg.models) {
    // ВНИМАНИЕ: физический model ID здесь НЕ хранится намеренно — он живёт только в конфиге шлюза.
    await prisma.aiModel.upsert({
      where: { alias: m.alias },
      update: { role: m.role, providerId: provider.id, isEnabled: true, supportsTools: m.supportsTools, supportsStructuredOutput: m.supportsStructuredOutput, description: m.description },
      create: { alias: m.alias, role: m.role, providerId: provider.id, supportsTools: m.supportsTools, supportsStructuredOutput: m.supportsStructuredOutput, description: m.description },
    });
  }

  for (const p of cfg.policies) {
    await upsertRoutingPolicy(prisma, { workspaceId: null, useCase: p.useCase, modelAlias: p.modelAlias, description: p.description });
  }

  for (const sp of cfg.prompts) {
    const existingActive = await prisma.promptTemplate.findFirst({ where: { workspaceId: null, key: sp.key, status: 'active' } });
    if (existingActive) continue;
    const anyVersion = await prisma.promptTemplate.findFirst({ where: { workspaceId: null, key: sp.key } });
    if (anyVersion) continue; // есть версии, но нет активной — решает человек, не сид
    await createPromptVersion(prisma, { key: sp.key, content: sp.content, workspaceId: null, variablesSchema: sp.variablesSchema, activate: true });
  }

  return { provider: provider.slug, models: cfg.models.length, policies: cfg.policies.length, prompts: cfg.prompts.length };
}
