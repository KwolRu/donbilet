import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class EmailService {
  private logger = new Logger(EmailService.name);
  constructor(
    @InjectQueue(process.env.BULLMQ_NOTIFICATIONS_QUEUE || 'global_notification_dispatch')
    private readonly notificationsQueue: Queue,
  ) {}

  /**
   * Отправляет 6-значный код подтверждения email
   */
  async sendVerificationCode(email: string, code: string): Promise<void> {
    await this.notificationsQueue.add('email-verification', {
      kind: 'email-verification',
      email,
      code,
    });
    this.logger.log(`[EMAIL enqueue] verification scheduled for ${email}`);
  }

  /**
   * Отправляет письмо с восстановлением пароля
   */
  async sendPasswordResetCode(email: string, code: string): Promise<void> {
    await this.notificationsQueue.add('email-password-reset', {
      kind: 'email-password-reset',
      email,
      code,
    });
    this.logger.log(`[EMAIL enqueue] password reset scheduled for ${email}`);
  }

  /**
   * Кладёт в очередь приглашение в workspace со ссылкой-регистрацией.
   * Само письмо отправляет notification-service — доменный сервис только публикует джобу.
   */
  async sendInviteEmail(
    email: string,
    payload: { inviteUrl: string; workspaceName: string; role: string },
  ): Promise<void> {
    await this.notificationsQueue.add('invite-email', {
      kind: 'invite-email',
      email,
      ...payload,
    });
    this.logger.log(`[EMAIL enqueue] invite scheduled for ${email}`);
  }
}
