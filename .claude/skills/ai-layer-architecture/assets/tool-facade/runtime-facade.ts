/**
 * ШАБЛОН: фасад agent runtime. ЕДИНСТВЕННОЕ место, где живёт фреймворк агента.
 *
 * Зачем: фреймворки агентов меняют API чаще всех остальных зависимостей. Через фасад
 * замена фреймворка = переписать этот файл. Без фасада = переписать домен.
 *
 * ИНВАРИАНТЫ:
 *  - Рантайм видит ТОЛЬКО шлюз (OpenAI-совместимый эндпоинт). Ни provider-SDK, ни агрегатора.
 *  - Модель создаётся из ЛОГИЧЕСКОГО алиаса; физический model ID здесь неизвестен.
 *  - Наружу отдаются простые типы; ничего специфичного для фреймворка не протекает.
 *
 * АДАПТАЦИЯ: заменить импорты фреймворка, `loadAiSecrets`, имена заголовков телеметрии.
 */

import { AsyncLocalStorage } from 'node:async_hooks';
import type { z } from 'zod';
import { loadAiSecrets } from './ai-secrets'; // TODO: секреты проекта (Vault/env)

// ─────────────────────────────────────────────────────────────────────────────
// Телеметрия одного вызова. AsyncLocalStorage, а НЕ поле модуля: вызовы идут
// параллельно, и глобальная переменная приписала бы модель одного запроса другому.
// ─────────────────────────────────────────────────────────────────────────────
interface CallTelemetry {
  /** Физическая модель, реально обслужившая запрос. */
  physicalModel?: string;
  /** Стоимость по данным шлюза — авторитетнее, чем разбор usage. */
  costUsd?: number;
  callId?: string;
}
const callTelemetry = new AsyncLocalStorage<CallTelemetry>();

// Заголовки телеметрии шлюза. TODO: сверить с конкретным шлюзом.
const H_MODEL = 'x-litellm-model-name';
const H_COST = 'x-litellm-response-cost';
const H_CALL_ID = 'x-litellm-call-id';

// ─────────────────────────────────────────────────────────────────────────────
// Публичный контракт фасада — это ВСЁ, что знает доменный код.
// ─────────────────────────────────────────────────────────────────────────────

/** Framework-agnostic дескриптор инструмента: домен передаёт функцию и zod-схему. */
export interface ToolDescriptor {
  id: string;
  description: string;
  inputSchema: z.ZodType<any>;
  /** Должен идти в governed-путь (tool endpoint → policy), НЕ в бизнес-БД напрямую. */
  execute: (args: any) => Promise<unknown>;
}

export interface StructuredAgentRun<T> {
  /** Логический алиас шлюза — НЕ физический model ID. */
  modelAlias: string;
  agentId: string;
  instructions: string;
  input: string;
  schema: z.ZodType<T>;
  tools?: ToolDescriptor[];
  /** Лимит шагов агента (защита от tool-loop). */
  maxSteps?: number;
  maxOutputTokens?: number;
}

export interface StructuredAgentResult<T> {
  object: T;
  usage?: { inputTokens?: number; outputTokens?: number; totalTokens?: number; costUsd?: number };
  /** Постфактум-наблюдаемость: кто реально ответил (в т.ч. после fallback). */
  physicalModel?: string;
  gatewayCallId?: string;
  finishReason?: string;
  toolCalls?: Array<{ toolName: string }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Ниже — всё, что специфично для фреймворка и рантайма.
// ─────────────────────────────────────────────────────────────────────────────

type AgentModule = typeof import('@mastra/core/agent');
type CompatModule = typeof import('@ai-sdk/openai-compatible');

let cached: Promise<{ agentMod: AgentModule; provider: ReturnType<CompatModule['createOpenAICompatible']> }> | null = null;

async function gatewayConfig(): Promise<{ baseURL: string; apiKey: string }> {
  const { gatewayBaseUrl, gatewayKey } = await loadAiSecrets();
  return { baseURL: gatewayBaseUrl.replace(/\/$/, '') + '/v1', apiKey: gatewayKey };
}

async function getRuntime() {
  if (!cached) {
    cached = (async () => {
      // Динамический import(): библиотеки ESM-only, а сервис может компилироваться в CJS.
      const agentMod = await import('@mastra/core/agent');
      const compatMod = await import('@ai-sdk/openai-compatible');
      const { baseURL, apiKey } = await gatewayConfig();
      const provider = compatMod.createOpenAICompatible({
        name: 'gateway',
        baseURL,
        apiKey,
        // Перехват заголовков: тело ответа содержит АЛИАС, физическая модель и
        // авторитетная стоимость приходят в ЗАГОЛОВКАХ.
        fetch: (async (input: RequestInfo | URL, init?: RequestInit) => {
          const res = await fetch(input, init);
          const slot = callTelemetry.getStore();
          if (slot) {
            slot.physicalModel = res.headers.get(H_MODEL) ?? undefined;
            slot.callId = res.headers.get(H_CALL_ID) ?? undefined;
            const cost = Number(res.headers.get(H_COST));
            if (Number.isFinite(cost)) slot.costUsd = cost;
          }
          return res;
        }) as never,
      });
      return { agentMod, provider };
    })();
  }
  return cached;
}

/** json_object-режим у ряда моделей требует слова "json" в промпте — гарантируем его. */
function ensureJsonHint(instructions: string): string {
  if (/\bjson\b/i.test(instructions)) return instructions;
  return `${instructions}\n\nОтветь СТРОГО как JSON-объект, соответствующий схеме.`;
}

/** Форма результата зависит от версии SDK — разбор изолирован здесь. */
function extractToolCalls(res: any): Array<{ toolName: string }> | undefined {
  const names = new Set<string>();
  const collect = (arr: any) => {
    if (!Array.isArray(arr)) return;
    for (const t of arr) {
      const n = t?.toolName ?? t?.name ?? t?.payload?.toolName ?? t?.toolCall?.toolName;
      if (typeof n === 'string' && n) names.add(n);
    }
  };
  collect(res?.toolCalls);
  if (Array.isArray(res?.steps)) for (const s of res.steps) collect(s?.toolCalls);
  return names.size ? [...names].map((toolName) => ({ toolName })) : undefined;
}

/**
 * Запустить агента со СТРУКТУРИРОВАННЫМ выводом. Возвращает валидированный по схеме объект
 * + наблюдаемость. Никакого chain-of-thought наружу — только поля схемы.
 */
export async function runStructuredAgent<T>(run: StructuredAgentRun<T>): Promise<StructuredAgentResult<T>> {
  const telemetry: CallTelemetry = {};
  return callTelemetry.run(telemetry, () => runInner(run, telemetry));
}

async function runInner<T>(run: StructuredAgentRun<T>, telemetry: CallTelemetry): Promise<StructuredAgentResult<T>> {
  const { agentMod, provider } = await getRuntime();
  const model = provider(run.modelAlias);

  // Инструменты фреймворка строятся ЗДЕСЬ из дескрипторов — домен их не импортирует.
  let tools: Record<string, unknown> | undefined;
  if (run.tools?.length) {
    const { createTool } = await import('@mastra/core/tools');
    tools = {};
    for (const d of run.tools) {
      tools[d.id] = createTool({
        id: d.id,
        description: d.description,
        inputSchema: d.inputSchema as never,
        execute: (async (inputData: unknown) => d.execute(inputData)) as never,
      });
    }
  }

  const agent = new agentMod.Agent({
    id: run.agentId,
    name: run.agentId,
    instructions: ensureJsonHint(run.instructions),
    model: model as never,
    ...(tools ? { tools: tools as never } : {}),
  });

  const res: any = await agent.generate(run.input, {
    structuredOutput: { schema: run.schema },
    ...(run.maxSteps ? { maxSteps: run.maxSteps } : {}),
    ...(run.maxOutputTokens ? { maxOutputTokens: run.maxOutputTokens } : {}),
  } as never);

  const rawCost = res?.usage?.raw?.raw?.cost ?? res?.usage?.raw?.cost;
  return {
    object: res.object as T,
    usage: {
      inputTokens: res?.usage?.inputTokens,
      outputTokens: res?.usage?.outputTokens,
      totalTokens: res?.usage?.totalTokens,
      // Стоимость от шлюза приоритетнее разбора usage: авторитетна и не зависит от формы ответа.
      costUsd: telemetry.costUsd ?? (typeof rawCost === 'number' ? rawCost : undefined),
    },
    physicalModel: telemetry.physicalModel,
    gatewayCallId: telemetry.callId,
    finishReason: res?.finishReason,
    toolCalls: extractToolCalls(res),
  };
}
