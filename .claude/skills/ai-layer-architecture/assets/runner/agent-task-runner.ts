/**
 * ШАБЛОН: ОБЩИЙ RUNNER всех AI-задач.
 *
 * Одна задача = набор параметров к этому runner'у, а не собственный поток исполнения.
 * Как только появляется вторая реализация «того же, но чуть иначе», расходятся
 * идемпотентность, журнал, обработка ошибок и бюджет.
 *
 * ПОРЯДОК ШАГОВ НЕ ПРОИЗВОЛЕН — см. references/runner-and-routing.md.
 *
 * АДАПТАЦИЯ: DI/логгер/ORM под проект; `workspaceId` → имя tenant-поля проекта.
 */

import { BadGatewayException, BadRequestException, HttpException, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { z } from 'zod';

import { runStructuredAgent, type ToolDescriptor } from '../tool-facade/runtime-facade';
import { withSpan, currentTraceId } from './tracing';
import {
  AGENT_LIMITS,
  assertInputSize,
  assertNoSecretLeak,
  enforceInputBounds,
  frameUntrustedContext,
  GuardrailInputError,
  GuardrailOutputError,
} from './guardrails'; // → ai-evals-ops/assets/eval-suite/guardrails.ts

/** Общий ответ ЛЮБОЙ AI-задачи. Единый контракт наружу. */
export interface AgentTaskResponse<TResult> {
  executionId: string;
  idempotencyKey: string;
  status: string;
  useCase: string;
  modelAlias: string;
  promptKey: string;
  promptVersion: number;
  result: TResult;
  usage?: { inputTokens?: number; outputTokens?: number; totalTokens?: number; costUsd?: number };
  toolCalls?: Array<{ toolName: string }>;
  /** true = повтор по idempotencyKey, модель НЕ вызывалась. Вызывающий обязан различать. */
  reused: boolean;
  correlationId?: string;
}

/** Параметры одного use case поверх общего runtime. */
export interface AgentTaskParams<TLlm, TResult> {
  useCase: string;
  workspaceId: string;
  agentId: string;
  spanName: string;
  idempotencyKey?: string;
  correlationId?: string;
  /** Недоверенный клиентский контекст (обрамляется как ДАННЫЕ). */
  contextHint?: string;
  /** Task-specific вход БЕЗ contextHint — его добавит runner как untrusted. */
  buildBaseInput: () => string;
  /** Рендер инструкций из активного промпта (подстановка переменных). */
  renderInstructions: (promptContent: string) => string;
  /** ТОЛЕРАНТНАЯ схема того, что реально присылает модель. */
  schema: z.ZodType<TLlm>;
  /** Инструменты агента (режим tool-loop). Игнорируются, если задан gatherContext. */
  tools?: ToolDescriptor[];
  /**
   * Детерминированный сбор контекста ДО LLM через те же governed-инструменты.
   * Если задан — агент вызывается БЕЗ tools (чистая structured-генерация).
   */
  gatherContext?: () => Promise<{ contextText: string; toolCalls: Array<{ toolName: string }> }>;
  /** Подмешивать знания тенанта. Только для ГЕНЕРАТИВНЫХ задач. */
  useKnowledgeBase?: boolean;
  maxToolSteps?: number;
  maxOutputTokens?: number;
  /** LLM-объект → строгий доменный результат + строки для secret-scan. */
  postProcess: (llm: TLlm) => { result: TResult; secretScan: string[] };
}

@Injectable()
export class AgentTaskRunner {
  private readonly logger = new Logger(AgentTaskRunner.name);

  constructor(
    private readonly prisma: PrismaService,      // TODO: ORM проекта
    private readonly aiConfig: AiConfigService,  // → ai-config.logic.ts
    private readonly budget: AiBudgetService,    // → ai-evals-ops/assets/eval-suite/budget.ts
  ) {}

  run<TLlm, TResult>(params: AgentTaskParams<TLlm, TResult>): Promise<AgentTaskResponse<TResult>> {
    return withSpan(params.spanName, (span) => this.execute(params, span), {
      'ai.use_case': params.useCase,
      'ai.workspace_id': params.workspaceId,
    });
  }

  private async execute<TLlm, TResult>(
    params: AgentTaskParams<TLlm, TResult>,
    span: { setAttribute: (k: string, v: string | number | boolean) => void },
  ): Promise<AgentTaskResponse<TResult>> {
    const { useCase, workspaceId } = params;
    const idempotencyKey = params.idempotencyKey ?? randomUUID();
    const correlationId = params.correlationId ?? currentTraceId();

    // ── 1. Границы входа (до любых трат) ──────────────────────────────────────
    try {
      enforceInputBounds({ contextHint: params.contextHint });
    } catch (e) {
      throw this.mapError(e);
    }

    // ── 2. Идемпотентность: завершённое выполнение → БЕЗ нового вызова модели ──
    const existing = await this.prisma.aiTaskExecution.findUnique({ where: { idempotencyKey } });
    if (existing?.status === 'completed' && existing.storedResult) {
      const stored = existing.storedResult as { result?: TResult };
      if (stored?.result) {
        span.setAttribute('ai.idempotent_reuse', true);
        return this.toResponse(useCase, existing, stored.result, true);
      }
    }

    // ── 3. Бюджет: ПЕРЕД тратой и ПОСЛЕ идемпотентности ───────────────────────
    // Повтор с тем же ключом денег не тратит — упирать его в лимит было бы неверно.
    try {
      await this.budget.assertWithinBudget(workspaceId);
    } catch (e) {
      throw this.mapError(e); // иначе доменная ошибка уйдёт как 500 и станет неотличима от сбоя
    }

    // ── 4. Резолв конфигурации ────────────────────────────────────────────────
    const { modelAlias, prompt } = await withSpan('ai.resolve_config', async () => ({
      modelAlias: await this.aiConfig.resolveModelAlias(useCase, workspaceId),
      prompt: await this.aiConfig.resolveActivePrompt(useCase, workspaceId),
    }));
    span.setAttribute('ai.model_alias', modelAlias);
    span.setAttribute('ai.prompt_version', prompt.version);

    // ── 5. Журнал: running ────────────────────────────────────────────────────
    const execution = await this.aiConfig.recordExecution({
      workspaceId, taskType: useCase, idempotencyKey, correlationId, modelAlias,
      promptKey: prompt.key, promptVersion: prompt.version, status: 'running',
    });

    const startedAt = Date.now();
    try {
      // ── 6. Детерминированный сбор контекста через governed-инструменты ──────
      let gathered: { contextText: string; toolCalls: Array<{ toolName: string }> } | null = null;
      if (params.gatherContext) {
        gathered = await withSpan('ai.gather_context', () => params.gatherContext!());
      }
      const contextBlock = gathered ? `\n\nДанные (из governed-инструментов):\n${gathered.contextText}` : '';

      // ── 7. Знания тенанта (только генеративные задачи), версии → в журнал ────
      const knowledge = params.useKnowledgeBase
        ? await withSpan('ai.knowledge_context', () => buildKnowledgeContext(this.prisma, workspaceId))
        : { text: '', versions: [] as Array<{ section: string; version: number }>, truncated: false };

      // ── 8. Сборка входа: порядок блоков фиксирован, untrusted — последним ────
      const input = params.buildBaseInput() + contextBlock + knowledge.text + frameUntrustedContext(params.contextHint);
      assertInputSize(input);
      const instructions = params.renderInstructions(prompt.content);

      // Контекст собран детерминированно → агент БЕЗ tools (иначе лишние шаги и деньги).
      const llmTools = gathered ? undefined : params.tools;

      // ── 9. Вызов модели ─────────────────────────────────────────────────────
      const run = await withSpan(
        'ai.llm.generate',
        () =>
          this.withTimeout(
            runStructuredAgent({
              modelAlias, agentId: params.agentId, instructions, input, schema: params.schema,
              tools: llmTools,
              maxSteps: params.maxToolSteps ?? AGENT_LIMITS.maxToolSteps,
              maxOutputTokens: params.maxOutputTokens ?? AGENT_LIMITS.maxOutputTokens,
            }),
            AGENT_LIMITS.timeoutMs,
          ),
        { 'ai.model_alias': modelAlias },
      );
      const toolCalls = gathered ? gathered.toolCalls : run.toolCalls;

      // ── 10-11. Нормализация + OUTPUT guardrails (safe fail) ─────────────────
      const { result, secretScan } = params.postProcess(run.object);
      for (const s of secretScan) assertNoSecretLeak(s);

      // ── 12. Журнал: completed + вся телеметрия ──────────────────────────────
      const latencyMs = Date.now() - startedAt;
      const finished = await withSpan('ai.persist_execution', () =>
        this.aiConfig.recordExecution({
          workspaceId, taskType: useCase, idempotencyKey, correlationId, modelAlias,
          promptKey: prompt.key, promptVersion: prompt.version, status: 'completed',
          // ФИЗИЧЕСКАЯ модель из заголовка шлюза, не алиас: иначе после fallback
          // неизвестно, какой upstream ответил.
          model: run.physicalModel ?? modelAlias,
          provider: providerOf(run.physicalModel),
          promptTokens: run.usage?.inputTokens,
          completionTokens: run.usage?.outputTokens,
          costUsd: run.usage?.costUsd,
          latencyMs,
          attempts: (execution.attempts ?? 0) + 1,
          storedResult: { result, toolCalls: toolCalls ?? [] },
          knowledgeVersions: knowledge.versions.length
            ? { sections: knowledge.versions, truncated: knowledge.truncated }
            : undefined,
        }),
      );

      // ── 13. Внешняя трассировка: best-effort, не роняет задачу ──────────────
      await recordGeneration({
        name: params.agentId, workspaceId, useCase, modelAlias,
        model: run.physicalModel ?? modelAlias,
        promptKey: prompt.key, promptVersion: prompt.version,
        inputTokens: run.usage?.inputTokens, outputTokens: run.usage?.outputTokens,
        costUsd: run.usage?.costUsd, latencyMs, status: 'completed',
        traceId: correlationId, executionId: finished.id, toolCalls,
      }).catch(() => undefined);

      return this.toResponse(useCase, finished, result, false, { usage: run.usage, toolCalls }, correlationId);
    } catch (e) {
      // Журнал пишется И в ветке ошибки: иначе провалы невидимы, а success rate
      // считается по выжившим.
      const status = e instanceof GuardrailOutputError ? 'needs_review' : 'failed';
      await this.aiConfig
        .recordExecution({
          workspaceId, taskType: useCase, idempotencyKey, correlationId, modelAlias,
          promptKey: prompt.key, promptVersion: prompt.version, status,
          latencyMs: Date.now() - startedAt, attempts: (execution.attempts ?? 0) + 1,
        })
        .catch(() => undefined);
      throw this.mapError(e);
    }
  }

  private withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error(`agent timeout после ${ms}ms`)), ms);
      p.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
    });
  }

  private toResponse<TResult>(
    useCase: string,
    exec: { id: string; idempotencyKey: string; status: string; modelAlias: string | null; promptKey: string | null; promptVersion: number | null },
    result: TResult,
    reused: boolean,
    run?: { usage?: AgentTaskResponse<TResult>['usage']; toolCalls?: Array<{ toolName: string }> },
    correlationId?: string,
  ): AgentTaskResponse<TResult> {
    return {
      executionId: exec.id,
      idempotencyKey: exec.idempotencyKey,
      status: exec.status,
      useCase,
      modelAlias: exec.modelAlias ?? '',
      promptKey: exec.promptKey ?? useCase,
      promptVersion: exec.promptVersion ?? 1,
      result,
      usage: run?.usage,
      toolCalls: run?.toolCalls,
      reused,
      correlationId,
    };
  }

  /**
   * Ошибки — КОНТРАКТ: реакция вызывающего на каждую причину разная.
   * Наружу — без секретов и стектрейсов.
   */
  private mapError(e: unknown): Error {
    if (e instanceof AiBudgetExceededError) {
      // 402, а не 500: задача корректна, но денег на неё нет. Клиент должен отличать
      // «почини запрос» от «пополни лимит», а оркестратор — не ретраить.
      return new HttpException(
        { statusCode: 402, error: 'AiBudgetExceeded', message: e.message, spentUsd: e.spentUsd, limitUsd: e.limitUsd, period: e.period },
        402,
      );
    }
    if (e instanceof GuardrailInputError) return new BadRequestException(`Некорректный вход: ${e.message}`);
    if (e instanceof GuardrailOutputError) {
      this.logger.warn(`Output guardrail сработал: ${e.message}`);
      return new BadGatewayException('Ответ AI отклонён проверкой безопасности (needs review)');
    }
    const msg = e instanceof Error ? e.message : String(e);
    const lower = msg.toLowerCase();
    if (/timeout/.test(lower)) return new BadGatewayException('AI-задача превысила таймаут');
    if (/no object generated|schema|invalid.*output|zod/.test(lower)) {
      this.logger.warn(`Invalid structured output: ${msg.slice(0, 200)}`);
      return new BadGatewayException('AI вернул некорректный структурированный ответ');
    }
    if (/tool.*deni|forbidden|policy|not authorized/.test(lower)) {
      return new BadRequestException('Инструмент отклонён политикой доступа');
    }
    if (/econnrefused|fetch failed|network|gateway|connect/.test(lower)) {
      this.logger.error(`LLM/шлюз недоступен: ${msg.slice(0, 200)}`);
      return new BadGatewayException('AI-шлюз временно недоступен');
    }
    this.logger.error(`AI task failed: ${msg.slice(0, 300)}`);
    return new BadGatewayException('AI-задача завершилась ошибкой');
  }
}
