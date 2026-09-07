/**
 * ШАБЛОН: governed-инструмент агента.
 *
 * ПУТЬ СТРОГО: агент → этот дескриптор → tool-эндпоинт владельца данных
 *              → policy decision (fail-CLOSED) → данные → safe-проекция → валидация.
 * Агент НЕ ходит в бизнес-БД и НЕ зовёт обычный API домена в обход governance.
 *
 * АДАПТАЦИЯ: заменить URL/заголовки транспорта, схемы и проекцию под свой домен.
 */

import { z } from 'zod';
import type { ToolDescriptor } from './runtime-facade';

const SERVICE_ID_HEADER = 'x-mcp-service-id';
const SERVICE_TOKEN_HEADER = 'x-mcp-service-token';

export class ToolAccessError extends Error {}

export interface ToolCtx {
  /** Tenant-контекст вызова — берётся из ПРОВЕРЕННОГО claim'а, не из входящего заголовка. */
  workspaceId: string;
  correlationId?: string;
}

// ── Схемы: вход строгий (аргументы придумала модель), выход — safe-проекция ──────

const GetEntityInput = z.object({
  entityId: z.string().uuid(),
});

/**
 * SAFE-ПРОЕКЦИЯ. Отдаём ФАКТЫ, а не значения: тип канала и достижимость — да,
 * сам номер/адрес — НЕТ. Отправку выполняет детерминированный код, у которого есть адрес.
 */
const EntityCardSchema = z.object({
  name: z.string(),
  city: z.string().optional(),
  category: z.string().optional(),
  status: z.string().optional(),
  channels: z.array(
    z.object({
      channel: z.string(),
      reachability: z.enum(['reachable', 'unknown', 'unreachable']),
      preferred: z.boolean().optional(),
    }),
  ),
});
export type EntityCard = z.infer<typeof EntityCardSchema>;

// ── Транспорт ────────────────────────────────────────────────────────────────────

function ownerBase(): string {
  return (process.env.DOMAIN_SERVICE_URL || 'http://localhost:5001').replace(/\/$/, '');
}

async function invokeGovernedTool(tool: string, args: unknown, ctx: ToolCtx): Promise<unknown> {
  const token = process.env.MCP_AI_SERVICE_TOKEN;
  // Fail-closed: без конфигурации секрета инструмент не работает, а не работает «как-нибудь».
  if (!token) throw new ToolAccessError('service token не сконфигурирован');

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), Number(process.env.MCP_TOOL_TIMEOUT_MS || 8000));
  let res: Response;
  try {
    res = await fetch(`${ownerBase()}/api/crm/mcp/tools/invoke`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        [SERVICE_ID_HEADER]: 'ai-service',
        [SERVICE_TOKEN_HEADER]: token,
      },
      body: JSON.stringify({
        actor: { service: 'ai-service', tenant: ctx.workspaceId },
        tool,
        correlationId: ctx.correlationId,
        args,
      }),
      signal: ctrl.signal,
    });
  } catch (e) {
    throw new ToolAccessError(`tool endpoint недоступен: ${(e as Error).message}`);
  } finally {
    clearTimeout(timer);
  }

  const body: any = await res.json().catch(() => ({}));
  // Классификация ошибок: реакция вызывающего на каждую — разная.
  if (res.status === 403) throw new ToolAccessError(`tool denied by policy: ${body?.reason ?? 'forbidden'}`);
  if (res.status === 404) throw new ToolAccessError('entity not found');
  if (!res.ok) throw new ToolAccessError(`tool error HTTP ${res.status}`);
  return body?.result ?? body;
}

// ── Дескриптор ───────────────────────────────────────────────────────────────────

export function buildEntityTool(ctx: ToolCtx): ToolDescriptor {
  return {
    id: 'get_entity',
    // description — ЧАСТЬ ПРОМПТА. Явно сказать, чего инструмент НЕ отдаёт:
    // это снимает попытки модели достать контакты через инструмент.
    description:
      'Получить безопасную карточку сущности по её id (название, город, категория, статус, ' +
      'типы доступных каналов и их достижимость). Контактные значения НЕ возвращаются.',
    inputSchema: GetEntityInput,
    execute: async (args: unknown): Promise<EntityCard> => {
      // 1) Валидация ВХОДА: аргументы придумала модель.
      const parsed = GetEntityInput.safeParse(args);
      if (!parsed.success) throw new ToolAccessError('malformed tool args: entityId должен быть UUID');

      const raw = await invokeGovernedTool('get_entity', parsed.data, ctx);

      // 2) Валидация ВЫХОДА: контракт удалённого сервиса мог измениться. Лучше узнать здесь,
      //    чем получить галлюцинацию, построенную на мусоре.
      const card = EntityCardSchema.safeParse(raw);
      if (!card.success) throw new ToolAccessError('tool вернул некорректную карточку');
      return card.data;
    },
  };
}

/**
 * Форматирование проекции в текстовый контекст для промпта.
 * Отдельная функция: решение «что модель увидит» должно быть явным и ревьюируемым.
 */
export function formatEntityContext(card: EntityCard): string {
  const channels = card.channels.length
    ? card.channels.map((c) => `${c.channel}(${c.reachability}${c.preferred ? ', preferred' : ''})`).join(', ')
    : 'нет каналов';
  return [
    `Сущность: ${card.name}${card.city ? `, ${card.city}` : ''}${card.category ? ` (${card.category})` : ''}.`,
    `Статус: ${card.status ?? 'н/д'}.`,
    `Доступные каналы: ${channels}.`,
  ].join('\n');
}
