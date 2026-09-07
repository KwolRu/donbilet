import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import { isDev } from '../../../../../shared/src/utils/is-dev.util';

interface MailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class EmailService {
  private logger = new Logger(EmailService.name);
  private transporter?: nodemailer.Transporter;
  private readonly isDev: boolean;

  constructor(private configService: ConfigService) {
    this.isDev = isDev(configService);
    this.initializeTransporter();
  }

  private initializeTransporter() {
    // Транспорт поднимаем всегда, когда задан MAIL_HOST — в т.ч. на локалке.
    // Отдельные dev-заглушки (verification/reset) сами решают, слать ли реально.
    const mailHost = this.configService.get('MAIL_HOST');
    if (!mailHost) {
      this.logger.warn('MAIL_HOST not configured - emails will be logged to console only');
      return;
    }

    const port = Number(this.configService.get('MAIL_PORT', 465));
    this.transporter = nodemailer.createTransport({
      host: mailHost,
      port,
      secure: port === 465,
      auth: {
        user: this.configService.get('MAIL_USER'),
        pass: this.configService.get('MAIL_PASSWORD'),
      },
    });
    this.logger.log(`Email service initialized (SMTP: ${mailHost}:${port})`);
  }

  /** Произвольное текстовое уведомление. Заготовка под доменные события. */
  async sendPlainNotification(
    email: string,
    payload: { subject: string; message: string },
  ): Promise<void> {
    if (this.isDev) {
      this.logger.log(`[DEV EMAIL] ${payload.subject} → ${email}: ${payload.message}`);
      return;
    }
    await this.sendEmail({
      to: email,
      subject: payload.subject,
      html: `<p>${payload.message}</p>`,
      text: payload.message,
    });
  }

  async sendInviteEmail(
    email: string,
    payload: { inviteUrl: string; workspaceName: string; role: string },
  ): Promise<void> {
    const subject = `Приглашение в «${payload.workspaceName}»`;
    const text =
      `Вас пригласили присоединиться к «${payload.workspaceName}» с ролью ${payload.role}.\n` +
      `Перейдите по ссылке, чтобы зарегистрироваться: ${payload.inviteUrl}\n` +
      `Ссылка действительна 7 дней.`;

    // Приглашения шлём реально всегда (в т.ч. на локалке), если настроен SMTP.
    // Без транспорта sendEmail сам залогирует письмо в консоль.
    await this.sendEmail({
      to: email,
      subject,
      html: `
      <h1>Приглашение в «${payload.workspaceName}»</h1>
      <p>Вас пригласили присоединиться с ролью <b>${payload.role}</b>.</p>
      <p>Нажмите кнопку, чтобы зарегистрироваться:</p>
      <p>
        <a href="${payload.inviteUrl}" style="
          display: inline-block;
          background: #4f46e5;
          color: #ffffff;
          text-decoration: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-weight: 600;
        ">Присоединиться</a>
      </p>
      <p>Или скопируйте ссылку: <a href="${payload.inviteUrl}">${payload.inviteUrl}</a></p>
      <p style="color:#6b7280">Ссылка действительна 7 дней.</p>
    `,
      text,
    });
  }

  async sendVerificationCode(email: string, code: string): Promise<void> {
    if (this.isDev) {
      this.logger.log(`[DEV EMAIL] Код подтверждения для: ${email}`);
      this.logger.log(`[DEV EMAIL] Код: ${code}`);
      return;
    }

    await this.sendEmail({
      to: email,
      subject: 'Код подтверждения email',
      html: `
      <h1>Подтверждение email</h1>
      <p>Спасибо за регистрацию!</p>
      <p>Ваш код подтверждения:</p>
      <h2 style="
        letter-spacing: 8px;
        font-size: 32px;
        text-align: center;
        background: #f5f5f5;
        padding: 16px;
        border-radius: 8px;
      ">${code}</h2>
      <p>Код действителен 10 минут.</p>
    `,
    });
  }

  async sendPasswordResetCode(email: string, code: string): Promise<void> {
    if (this.isDev) {
      this.logger.log(`[DEV EMAIL] Восстановление пароля для: ${email}`);
      this.logger.log(`[DEV EMAIL] Код: ${code}`);
      return;
    }

    await this.sendEmail({
      to: email,
      subject: 'Восстановление пароля',
      html: `
      <h1>Восстановление пароля</h1>
      <p>Вы запросили восстановление пароля.</p>
      <p>Ваш код подтверждения:</p>
      <h2 style="
        letter-spacing: 8px;
        font-size: 32px;
        text-align: center;
        background: #f5f5f5;
        padding: 16px;
        border-radius: 8px;
      ">${code}</h2>
      <p>Код действителен 10 минут.</p>
      <p>Если вы не запрашивали это, игнорируйте письмо.</p>
    `,
    });
  }

  private async sendEmail(options: MailOptions): Promise<void> {
    const mailOptions = {
      from: `${this.configService.get('MAIL_FROM_NAME', '__APP_NAME__')} <${this.configService.get('MAIL_FROM', 'noreply@__APP_DOMAIN__')}>`,
      ...options,
    };

    if (!this.transporter) {
      this.logger.log(`[DEV EMAIL] To: ${options.to}`);
      this.logger.log(`[DEV EMAIL] Subject: ${options.subject}`);
      this.logger.log(`[DEV EMAIL] HTML: ${options.html}`);
      return;
    }

    this.logger.log(`[EMAIL] Sending to: ${options.to} | Subject: ${options.subject}`);

    try {
      const result = await this.transporter.sendMail(mailOptions);
      this.logger.log(`[EMAIL] Sent successfully to ${options.to} (messageId: ${result.messageId})`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}:`, error);
      throw error;
    }
  }
}
