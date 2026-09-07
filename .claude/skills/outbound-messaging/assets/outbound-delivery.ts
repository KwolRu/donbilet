/**
 * ШАБЛОН: ЕДИНАЯ ТОЧКА ОТПРАВКИ (choke point).
 *
 * Это тот файл, который определяет, будут ли соблюдены гарантии. Все исходящие идут
 * СЮДА и только сюда: провайдеры не экспортируются наружу, инициировать отправку может
 * только этот сервис. Второй путь отправки = второй набор проверок, который однажды
 * забудут обновить.
 *
 * ПОРЯДОК ГЕЙТОВ НЕ ПРОИЗВОЛЕН — см. references/send-gate.md.
 */

import { Injectable, Logger } from '@nestjs/common';

import type { ChannelProvider, SendCommand, SendResult, ChannelType } from './channel-provider';

export interface DeliveryContext {
  workspaceId: string;
  /** Контакт получателя — по нему проверяются согласие и подавление. */
  contactId: string;
  /** Часовой пояс ПОЛУЧАТЕЛЯ: иначе «не писать ночью» соблюдается по времени дата-центра. */
  recipientTimezone?: string;
  correlationId?: string;
}

export interface DeliveryOutcome extends SendResult {
  /** Правило, по которому отказано (для интерфейса и разбора). */
  rejectedBy?: string;
  reason?: string;
}

@Injectable()
export class OutboundDeliveryService {
  private readonly logger = new Logger(OutboundDeliveryService.name);
  /** Реестр провайдеров. Новый канал добавляется ЗАПИСЬЮ сюда, тем же контрактом. */
  private readonly providers = new Map<ChannelType, ChannelProvider>();

  constructor(
    providers: ChannelProvider[],
    private readonly secrets: SecretsProvider,
    private readonly suppression: SuppressionService,
    private readonly policy: PolicyClient,
    private readonly limiter: RateLimiter,
    private readonly audit: AuditService,
  ) {
    for (const p of providers) this.providers.set(p.channel, p);
  }

  async send(cmd: SendCommand, ctx: DeliveryContext): Promise<DeliveryOutcome> {
    // ── 1. Провайдер известен ────────────────────────────────────────────────
    const provider = this.providers.get(cmd.channel);
    if (!provider) {
      return this.reject(cmd, ctx, 'no_provider', `канал ${cmd.channel} не поддержан`);
    }

    // Возможности канала — здесь, а не в бизнес-коде.
    const caps = provider.capabilities();
    if (cmd.body.length > caps.maxLength) {
      return this.reject(cmd, ctx, 'too_long', `превышен лимит канала (${caps.maxLength})`);
    }

    // ── 2. Секрет доступен (fail-closed для реальных провайдеров) ────────────
    if (!(await this.secrets.has(cmd.channel, cmd.workspaceId))) {
      return this.reject(cmd, ctx, 'secret_missing', 'секрет канала не сконфигурирован');
    }

    // ── 3. Идемпотентность ДО согласия и лимитов ─────────────────────────────
    // Повтор уже отправленного не должен упираться в лимит: физической отправки нет,
    // а вызывающий имеет право получить прежний результат.
    const prior = await this.audit.findByIdempotencyKey(cmd.idempotencyKey);
    if (prior?.status === 'sent') {
      return { status: 'sent', providerMessageId: prior.providerMessageId, reused: true };
    }

    // ── 4. Согласие и подавление — АБСОЛЮТНЫЙ запрет, до расписания и лимитов ─
    const s = await this.suppression.check(ctx.workspaceId, ctx.contactId);
    if (s.blacklisted) return this.reject(cmd, ctx, 'blacklisted', s.reason ?? 'чёрный список');
    if (s.unsubscribed) return this.reject(cmd, ctx, 'unsubscribed', 'получатель отписан');
    if (s.suppressed) return this.reject(cmd, ctx, 'suppressed', s.reason ?? 'адрес недоставим');

    // ── 5. Политика: стоп, окно, лимит, дубль ────────────────────────────────
    // ВСЕ факты подставляет СЕРВЕР. Клиент их не сообщает — иначе политика проверяет
    // то, что ей сказали.
    const facts = await this.buildPolicyFacts(cmd, ctx);
    const decision = await this.policy.authorize(facts);
    if (!decision.allow) {
      return this.reject(cmd, ctx, decision.rule ?? 'policy_denied', decision.reason);
    }

    // ── 6. Rate-limit: acquire → … → release в finally ───────────────────────
    // Незакрытый слот при исключении навсегда съедает пропускную способность.
    const slot = await this.limiter.acquire(cmd.channel, cmd.accountId ?? 'default');
    if (!slot.acquired) {
      return { status: 'failed', errorClass: 'rate_limit', retryAfterMs: slot.retryAfterMs };
    }

    try {
      // ── 7. Отправка ────────────────────────────────────────────────────────
      const result = await provider.send(cmd);

      // ── 8. Аудит: ВСЕГДА, включая неуспех ──────────────────────────────────
      await this.audit.record({ cmd, ctx, result });

      // Автоматическое пополнение подавления: это немедленное действие,
      // а не «когда-нибудь почистим базу».
      if (result.errorClass === 'invalid_recipient' || result.errorClass === 'blocked_by_user') {
        await this.suppression.add(ctx.workspaceId, ctx.contactId, result.errorClass);
      }
      return result;
    } finally {
      await this.limiter.release(slot);
    }
  }

  /** Отказ — тоже событие: причина сохраняется и доступна в интерфейсе. */
  private async reject(
    cmd: SendCommand,
    ctx: DeliveryContext,
    rule: string,
    reason: string,
  ): Promise<DeliveryOutcome> {
    this.logger.warn(`отправка отклонена [${rule}]: ${reason} (ws=${ctx.workspaceId})`);
    const outcome: DeliveryOutcome = { status: 'rejected', rejectedBy: rule, reason };
    await this.audit.record({ cmd, ctx, result: outcome });
    return outcome;
  }

  private async buildPolicyFacts(cmd: SendCommand, ctx: DeliveryContext) {
    return {
      approved: true,
      workspace: {
        id: ctx.workspaceId,
        // Глобальный СТОП читается ЗДЕСЬ, в момент отправки, а не при постановке в очередь:
        // между постановкой и исполнением проходит время, ради которого стоп и нужен.
        stop_flag: await this.policy.isWorkspaceStopped(ctx.workspaceId),
      },
      counters: {
        sent_today: await this.audit.countToday(ctx.workspaceId),
        duplicate_recent: await this.audit.hasRecentDuplicate(ctx.contactId, cmd.body),
      },
      limits: { daily_max: await this.policy.dailyLimit(ctx.workspaceId) },
      time: {
        hour: hourInTimezone(ctx.recipientTimezone),
        window_start: await this.policy.windowStart(ctx.workspaceId),
        window_end: await this.policy.windowEnd(ctx.workspaceId),
      },
    };
  }
}

function hourInTimezone(tz?: string): number {
  const fmt = new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hour12: false, timeZone: tz || 'UTC' });
  return Number(fmt.format(new Date()));
}

// ── заглушки под проект ─────────────────────────────────────────────────────
declare class SecretsProvider { has(channel: ChannelType, ws: string): Promise<boolean>; }
declare class SuppressionService {
  check(ws: string, contactId: string): Promise<{ blacklisted: boolean; unsubscribed: boolean; suppressed: boolean; reason?: string }>;
  add(ws: string, contactId: string, reason: string): Promise<void>;
}
declare class PolicyClient {
  authorize(facts: unknown): Promise<{ allow: boolean; reason: string; rule?: string }>;
  isWorkspaceStopped(ws: string): Promise<boolean>;
  dailyLimit(ws: string): Promise<number>;
  windowStart(ws: string): Promise<number>;
  windowEnd(ws: string): Promise<number>;
}
declare class RateLimiter {
  acquire(channel: string, account: string): Promise<{ acquired: boolean; retryAfterMs?: number }>;
  release(slot: unknown): Promise<void>;
}
declare class AuditService {
  findByIdempotencyKey(key: string): Promise<{ status: string; providerMessageId?: string } | null>;
  record(entry: unknown): Promise<void>;
  countToday(ws: string): Promise<number>;
  hasRecentDuplicate(contactId: string, body: string): Promise<boolean>;
}
