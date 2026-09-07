/**
 * ШАБЛОН: контракт провайдера канала.
 *
 * ИНВАРИАНТ: бизнес-код знает КАНАЛ, а не вендора. Особенности провайдеров (формат адреса,
 * лимит длины, требование инициации получателем, шаблоны) живут ВНУТРИ адаптера и
 * объявляются через capabilities().
 */

export type ChannelType = 'email' | 'telegram' | 'vk' | 'whatsapp' | 'sms';

/**
 * Возможности канала. ОБЯЗАТЕЛЬНЫ: без них в бизнес-код просачивается
 * «у телеграма нельзя писать первым», и абстракция протекает обратно.
 */
export interface ChannelCapabilities {
  maxLength: number;
  supportsSubject: boolean;
  supportsAttachments: boolean;
  supportsHtml: boolean;
  /** Нельзя писать первым — нужен контакт от получателя (telegram: /start). */
  requiresInitiationByRecipient: boolean;
  /** Требуется явное согласие до первого касания. */
  requiresOptIn: boolean;
  /** Окно свободного ответа после сообщения получателя, часы (whatsapp: 24). */
  replyWindowHours?: number;
  ratePerMinute: number;
}

export type ProviderErrorClass =
  | 'rate_limit'        // притормозить, вернуть retryAfterMs
  | 'quota_or_auth'     // ключ/аккаунт — вывести аккаунт из ротации
  | 'invalid_recipient' // адрес не существует → подавление, НИКОГДА не ретраить
  | 'blocked_by_user'   // получатель заблокировал → подавление навсегда
  | 'content_rejected'  // провайдер счёл спамом → в ревью, не ретраить
  | 'provider_failure'  // 5xx → ретрай
  | 'timeout';

export interface SendCommand {
  channel: ChannelType;
  to: string;
  body: string;
  subject?: string;
  /**
   * Формирует ВЫЗЫВАЮЩИЙ, детерминированно (`workspace:lead:touch`).
   * Случайный ключ означает, что ретрай доставки = второе сообщение клиенту.
   */
  idempotencyKey: string;
  workspaceId: string;
  correlationId?: string;
  /** Какой аккаунт-отправитель использовать (выбор server-side, по здоровью и загрузке). */
  accountId?: string;
}

export interface SendResult {
  status: 'sent' | 'rejected' | 'failed';
  /** Обязателен при успехе: без него не связать доставку, ответ, жалобу и отписку. */
  providerMessageId?: string;
  errorClass?: ProviderErrorClass;
  retryAfterMs?: number;
  /** true = сообщение с этим ключом уже отправлялось, повтора НЕ было. */
  reused?: boolean;
  detail?: string;
}

export interface ChannelProvider {
  readonly channel: ChannelType;
  /** Конкретная реализация: 'smtp' | 'sendgrid' | 'bot-api' … */
  readonly provider: string;

  capabilities(): ChannelCapabilities;
  send(cmd: SendCommand): Promise<SendResult>;
  health(): Promise<{ ok: boolean; reason?: string }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Пример: email. Наружу не протекает ни один термин вендора.
// ─────────────────────────────────────────────────────────────────────────────

export class EmailProvider implements ChannelProvider {
  readonly channel = 'email' as const;
  readonly provider = 'smtp';

  constructor(private readonly getSecret: () => Promise<{ host: string; user: string; pass: string }>) {}

  capabilities(): ChannelCapabilities {
    return {
      maxLength: 100_000,
      supportsSubject: true,
      supportsAttachments: true,
      supportsHtml: true,
      requiresInitiationByRecipient: false,
      requiresOptIn: false,
      ratePerMinute: 30,
    };
  }

  async send(cmd: SendCommand): Promise<SendResult> {
    // Секрет — fail-closed: нет ключа → отправки не происходит, а не «как-нибудь».
    const secret = await this.getSecret();
    if (!secret?.host) {
      return { status: 'failed', errorClass: 'quota_or_auth', detail: 'секрет канала не сконфигурирован' };
    }

    // Дедупликация на стороне провайдера — ДОПОЛНЕНИЕ к идемпотентности вызывающего,
    // а не замена: не все провайдеры умеют, полагаться нельзя.
    const already = await this.findByIdempotencyKey(cmd.idempotencyKey);
    if (already) return { status: 'sent', providerMessageId: already, reused: true };

    try {
      const messageId = await this.transportSend(cmd, secret);
      return { status: 'sent', providerMessageId: messageId, reused: false };
    } catch (e) {
      const errorClass = classifySendError(e);
      // 'rejected' — решение провайдера о содержимом/получателе; 'failed' — сбой.
      const status = errorClass === 'invalid_recipient' || errorClass === 'content_rejected' ? 'rejected' : 'failed';
      return { status, errorClass, retryAfterMs: retryHint(errorClass), detail: (e as Error).message.slice(0, 200) };
    }
  }

  async health() {
    try {
      await this.getSecret();
      return { ok: true };
    } catch (e) {
      return { ok: false, reason: (e as Error).message };
    }
  }

  private async findByIdempotencyKey(_key: string): Promise<string | null> { return null; }
  private async transportSend(_cmd: SendCommand, _s: unknown): Promise<string> { return 'msg-id'; }
}

/** Классификация ошибки отправки. Разница между invalid_recipient и provider_failure
 *  принципиальна: первое НЕЛЬЗЯ ретраить никогда, второе — нужно. */
export function classifySendError(err: unknown): ProviderErrorClass {
  const m = (err instanceof Error ? err.message : String(err)).toLowerCase();
  if (/550|5\.1\.1|no such user|recipient.*not.*exist|invalid.*address/.test(m)) return 'invalid_recipient';
  if (/blocked|bot was blocked|user is deactivated|chat not found/.test(m)) return 'blocked_by_user';
  if (/spam|content.*reject|policy.*violat/.test(m)) return 'content_rejected';
  if (/(^|\D)429(\D|$)|rate.?limit|too many/.test(m)) return 'rate_limit';
  if (/(^|\D)40[13](\D|$)|unauthorized|forbidden|quota|token/.test(m)) return 'quota_or_auth';
  if (/(^|\D)5\d\d(\D|$)|internal server|unavailable/.test(m)) return 'provider_failure';
  return 'timeout';
}

function retryHint(c: ProviderErrorClass): number | undefined {
  if (c === 'rate_limit') return 60_000;
  if (c === 'provider_failure' || c === 'timeout') return 15_000;
  return undefined; // остальное ретраить нельзя
}
