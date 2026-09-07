/**
 * ШАБЛОН: durable workflow (Temporal).
 *
 * ДЕТЕРМИНИЗМ: workflow воспроизводится из истории при каждом восстановлении. Здесь НЕЛЬЗЯ:
 *   Date.now(), Math.random(), randomUUID(), fetch, fs, ORM, process.env, синглтоны.
 * Всё это — в activity.
 *
 * ЛОВУШКА ИМПОРТОВ: не импортировать ЗНАЧЕНИЯ из модуля activities — он тянет ORM/сеть,
 * а workflow бандлится в изолированный контекст. Импортировать только `type`, а нужные
 * константы дублировать здесь явно (с комментарием почему) или держать в чистом модуле.
 */

import {
  proxyActivities,
  sleep,
  log,
  condition,
  defineSignal,
  defineQuery,
  setHandler,
  workflowInfo,
  continueAsNew,
} from '@temporalio/workflow';
import type * as activities from './activities';
import type * as aiActivities from './ai-activities';

// Зеркалит константы activities НАМЕРЕННО (см. «ловушка импортов» выше).
const DECISIONS = {
  skipped: 'skipped_already_verified',
  exhausted: 'attempts_exhausted',
} as const;

// ── Политики: у РАЗНЫХ по характеру activity — РАЗНЫЕ таймауты и ретраи ────────
// Общий профиль на всё означает, что тяжёлая работа падает по таймауту лёгкой.

const { verifyCandidate, establishStatus, rescore } = proxyActivities<typeof activities>({
  startToCloseTimeout: '30 seconds',
  retry: {
    initialInterval: '2 seconds',
    backoffCoefficient: 2,
    maximumInterval: '30 seconds',
    maximumAttempts: 4,
    // Неретраибельные: повторять 400/запрет политики бессмысленно.
    nonRetryableErrorTypes: ['BadRequestError', 'PolicyDeniedError'],
  },
});

const { runAiTask } = proxyActivities<typeof aiActivities>({
  // LLM медленнее обычной activity — свой профиль.
  startToCloseTimeout: '2 minutes',
  retry: { initialInterval: '5 seconds', backoffCoefficient: 2, maximumAttempts: 3 },
});

// ── Сигналы и запросы: замена поллингу ────────────────────────────────────────

export const stopSignal = defineSignal<[string]>('stop');
export const replySignal = defineSignal<[{ text: string; at: string }]>('replied');
export const statusQuery = defineQuery<{ step: string; stopped: boolean }>('status');

export interface LeadFlowInput {
  workspaceId: string;
  leadId: string;
  minAttempts: number;
  /** Счётчик итераций для continueAsNew — история workflow не бесконечна. */
  iteration?: number;
}

export async function leadFlow(input: LeadFlowInput): Promise<{ decision: string }> {
  let stopped = false;
  let stopReason = '';
  let reply: { text: string } | undefined;
  let step = 'start';

  setHandler(stopSignal, (reason) => {
    stopped = true;
    stopReason = reason;
  });
  setHandler(replySignal, (r) => {
    reply = r;
  });
  setHandler(statusQuery, () => ({ step, stopped }));

  const { workflowId } = workflowInfo();

  // ── Шаг 1: серия попыток верификации с ИНТЕРВАЛОМ ───────────────────────────
  // Durable-шаги, а не setTimeout: при падении воркера продолжится с того же места.
  step = 'verify';
  let verified = false;
  for (let attempt = 1; attempt <= input.minAttempts && !stopped; attempt++) {
    verified = await verifyCandidate({
      leadId: input.leadId,
      workspaceId: input.workspaceId,
      // Идемпотентный ключ формирует WORKFLOW — детерминированно, из workflowId и шага.
      // Сгенерированный внутри activity ключ при повторе не совпадёт, и побочный эффект
      // случится дважды.
      idempotencyKey: `${workflowId}:verify:${attempt}`,
    });
    if (verified) break;
    if (attempt < input.minAttempts) await sleep('30 minutes');
  }

  if (stopped) {
    log.info('workflow остановлен сигналом', { reason: stopReason });
    return { decision: 'stopped' };
  }
  if (!verified) return { decision: DECISIONS.exhausted };

  // ── Шаг 2: AI-задача через activity ─────────────────────────────────────────
  step = 'ai';
  const ai = await runAiTask({
    workspaceId: input.workspaceId,
    taskType: 'FIRST_MESSAGE_GENERATION',
    entityId: input.leadId,
    idempotencyKey: `${workflowId}:ai:first_message`,
  });

  // ── Шаг 3: ожидание ответа ИЛИ остановки — с ТАЙМАУТОМ ──────────────────────
  step = 'await_reply';
  const answered = await condition(() => !!reply || stopped, '7 days');

  // Ветка «никто не ответил» пишется реже всего — и именно она случается.
  if (!answered) {
    log.info('ответа нет за 7 дней — эскалация');
    await rescore({ leadId: input.leadId, workspaceId: input.workspaceId, reason: 'no_reply' });
  }

  await establishStatus({
    leadId: input.leadId,
    workspaceId: input.workspaceId,
    idempotencyKey: `${workflowId}:establish`,
  });

  // ── Длинные циклы: continueAsNew, иначе упрётесь в лимит размера истории ────
  const iteration = (input.iteration ?? 0) + 1;
  if (iteration < 10 && !stopped && !reply) {
    await continueAsNew<typeof leadFlow>({ ...input, iteration });
  }

  return { decision: reply ? 'replied' : 'completed' };
}
