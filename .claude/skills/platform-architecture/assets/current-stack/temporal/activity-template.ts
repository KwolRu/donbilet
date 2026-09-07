/**
 * ШАБЛОН: durable activity.
 *
 * ACTIVITY = НЕДЕТЕРМИНИРОВАННАЯ работа (сеть, LLM, БД, файлы) вне workflow.
 *
 * ПРАВИЛА:
 *  - Идемпотентна. Temporal гарантирует «хотя бы один раз»; «ровно один раз» обеспечивает
 *    ваш idempotencyKey, который приходит СНАРУЖИ (формирует workflow).
 *  - Внешние вызовы — только через адаптер/шлюз, не напрямую к вендору.
 *  - Ошибки классифицированы: неретраибельные помечаются, иначе Temporal будет упорно
 *    повторять то, что не починится.
 *  - Длинные activity шлют heartbeat, иначе heartbeatTimeout их убьёт.
 *
 * ЗАПУСК ВОРКЕРА: standalone-процесс обычно НЕ поднимает DI-контейнер приложения —
 * конфиг, логгер и ORM инициализируются вручную. Забытый dotenv в воркере — классическая
 * причина «локально не работает, в докере работает». Порт воркера фиксировать и проверять
 * на коллизии с легаси-стеком.
 */

import { Context, ApplicationFailure } from '@temporalio/activity';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// Клиент создаётся на уровне модуля: воркер живёт долго, пул переиспользуется.
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const AI_BASE = (process.env.AI_SERVICE_URL || 'http://localhost:5008').replace(/\/$/, '');

export interface RunAiTaskInput {
  workspaceId: string;
  taskType: string;
  entityId: string;
  /** Приходит СНАРУЖИ. При повторе обязан совпасть — иначе побочный эффект случится дважды. */
  idempotencyKey: string;
  correlationId?: string;
}

export interface RunAiTaskResult {
  executionId: string;
  status: string;
  result: unknown;
  /** true = задача уже выполнялась с этим ключом; модель НЕ вызывалась повторно. */
  reused: boolean;
  attempt: number;
}

export async function runAiTask(input: RunAiTaskInput): Promise<RunAiTaskResult> {
  const attempt = Context.current().info.attempt;

  // Service-to-service секрет: fail-closed при отсутствии конфигурации.
  const secret = process.env.INTERNAL_RPC_SECRET;
  if (!secret) throw ApplicationFailure.nonRetryable('INTERNAL_RPC_SECRET не сконфигурирован', 'ConfigError');

  const res = await fetch(`${AI_BASE}/api/ai/internal/execute-task`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-internal-secret': secret },
    body: JSON.stringify({
      workspaceId: input.workspaceId,
      taskType: input.taskType,
      idempotencyKey: input.idempotencyKey,
      correlationId: input.correlationId,
      input: { entityId: input.entityId },
    }),
  });

  const body: any = await res.json().catch(() => ({}));

  if (!res.ok) {
    // КЛАССИФИКАЦИЯ: реакция Temporal на разные коды принципиально разная.
    if (res.status === 400 || res.status === 403) {
      // Запрос не починится сам — повторять бессмысленно.
      throw ApplicationFailure.nonRetryable(`ai-service ${res.status}: ${body?.message}`, 'BadRequestError');
    }
    if (res.status === 402) {
      // Бюджет исчерпан: ретрай не поможет, нужно вмешательство.
      throw ApplicationFailure.nonRetryable(`бюджет исчерпан: ${body?.message}`, 'BudgetExceededError');
    }
    // 5xx/сеть — retryable: Temporal повторит по политике из proxyActivities.
    throw new Error(`ai-service HTTP ${res.status}: ${body?.message ?? 'error'}`);
  }

  return {
    executionId: body.executionId,
    status: body.status,
    result: body.result,
    reused: !!body.reused,
    attempt,
  };
}

/**
 * Пример ДЛИННОЙ activity с heartbeat и возобновлением с последней позиции.
 * Без heartbeat она будет убита heartbeatTimeout; без сохранения позиции ретрай начнёт с нуля.
 */
export async function collectBatch(input: { workspaceId: string; areaId: string; cursor?: string }): Promise<{ processed: number; cursor?: string }> {
  const ctx = Context.current();
  // При ретрае Temporal отдаёт последние heartbeat-детали — продолжаем с них, а не с начала.
  const startCursor = (ctx.info.heartbeatDetails as string | undefined) ?? input.cursor;

  let cursor = startCursor;
  let processed = 0;

  while (true) {
    const page = await fetchPage(input.areaId, cursor);
    await persistPage(input.workspaceId, page);
    processed += page.items.length;
    cursor = page.nextCursor;

    ctx.heartbeat(cursor);            // ← и живость, и позиция для возобновления
    if (ctx.cancellationSignal.aborted) break;  // корректная реакция на отмену workflow
    if (!cursor) break;
  }

  return { processed, cursor };
}

// ── Заглушки под проект ─────────────────────────────────────────────────────
declare function fetchPage(areaId: string, cursor?: string): Promise<{ items: unknown[]; nextCursor?: string }>;
declare function persistPage(workspaceId: string, page: { items: unknown[] }): Promise<void>;
