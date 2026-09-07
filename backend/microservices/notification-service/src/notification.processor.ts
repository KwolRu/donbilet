import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { SmsService } from './core/services/sms/sms.service';
import { EmailService } from './core/services/email/email.service';

/**
 * Контракт очереди уведомлений. Доменные сервисы кладут сюда джобы, не зная,
 * как именно доставляется сообщение (email/SMS/push) — добавляя канал, расширяйте
 * этот union и `process`, а не публикуйте новый тип джобы мимо него.
 *
 * Имя очереди несёт tenant-префикс: `<workspace_id>__notification__<queue>`
 * (см. ADR-0001 §7). Здесь оно берётся из env целиком.
 */
type NotificationJob =
  | { kind: 'sms-otp'; phone: string; code: string }
  | { kind: 'email-verification'; email: string; code: string }
  | { kind: 'email-password-reset'; email: string; code: string }
  | {
      kind: 'invite-email';
      email: string;
      inviteUrl: string;
      workspaceName: string;
      role: string;
    }
  | {
      kind: 'plain-email';
      workspaceId: string;
      email?: string | null;
      subject: string;
      message: string;
    };

@Processor(
  process.env.BULLMQ_NOTIFICATIONS_QUEUE || 'global_notification_dispatch',
)
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    private readonly smsService: SmsService,
    private readonly emailService: EmailService,
  ) {
    super();
  }

  async process(job: Job<NotificationJob>): Promise<void> {
    const payload = job.data;
    this.logger.log(`Processing notification job ${job.id} (${payload.kind})`);

    if (payload.kind === 'sms-otp') {
      await this.smsService.sendOtp(payload.phone, payload.code);
      return;
    }

    if (payload.kind === 'email-verification') {
      await this.emailService.sendVerificationCode(payload.email, payload.code);
      return;
    }

    if (payload.kind === 'email-password-reset') {
      await this.emailService.sendPasswordResetCode(payload.email, payload.code);
      return;
    }

    if (payload.kind === 'invite-email') {
      await this.emailService.sendInviteEmail(payload.email, {
        inviteUrl: payload.inviteUrl,
        workspaceName: payload.workspaceName,
        role: payload.role,
      });
      return;
    }

    if (payload.kind === 'plain-email') {
      if (payload.email) {
        await this.emailService.sendPlainNotification(payload.email, {
          subject: payload.subject,
          message: payload.message,
        });
      } else {
        this.logger.log(
          `Notification «${payload.subject}» for workspace ${payload.workspaceId} ` +
            `(без email): ${payload.message}`,
        );
      }
    }
  }
}
