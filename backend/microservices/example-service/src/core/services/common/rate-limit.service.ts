import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '../auth/cache/cache.service';

interface RateLimitConfig {
  windowMs: number; // milliseconds
  maxAttempts: number;
}

@Injectable()
export class RateLimitService {
  private logger = new Logger(RateLimitService.name);

  /**
   * Лимиты берутся из окружения (см. backend/.env.example) — их подкручивают
   * под нагрузку без пересборки. Дефолты консервативные: лучше отсечь лишнего
   * бота, чем оставить брутфорс открытым.
   *
   * Считаются в конструкторе, а не в инициализаторе поля: инициализаторы полей
   * выполняются раньше, чем присваиваются parameter properties, и `configService`
   * там ещё undefined.
   */
  private readonly configs: {
    login: RateLimitConfig;
    register: RateLimitConfig;
    resendVerification: RateLimitConfig;
    smsSend: RateLimitConfig & { minIntervalMs: number };
  };

  constructor(
    private cacheService: CacheService,
    private configService: ConfigService,
  ) {
    this.configs = {
      login: {
        windowMs: 15 * 60 * 1000,
        maxAttempts: this.numberFromEnv('LOGIN_RATE_LIMIT_MAX_ATTEMPTS', 5),
      },
      register: {
        windowMs: 60 * 60 * 1000,
        maxAttempts: this.numberFromEnv('REGISTER_RATE_LIMIT_MAX_ATTEMPTS', 3),
      },
      resendVerification: {
        windowMs: 60 * 60 * 1000,
        maxAttempts: this.numberFromEnv('RESEND_RATE_LIMIT_MAX_ATTEMPTS', 3),
      },
      smsSend: {
        windowMs: 5 * 60 * 1000,
        maxAttempts: this.numberFromEnv('SMS_RATE_LIMIT_MAX_ATTEMPTS', 3),
        minIntervalMs: 30 * 1000,
      },
    };
  }

  private numberFromEnv(key: string, fallback: number): number {
    const raw = this.configService.get<string | number>(key);
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  /**
   * Проверяет rate limit для входа
   */
  async checkLoginLimit(identifier: string): Promise<void> {
    await this.checkLimit('login', identifier, this.configs.login);
  }

  /**
   * Проверяет rate limit для регистрации
   */
  async checkRegisterLimit(identifier: string): Promise<void> {
    await this.checkLimit('register', identifier, this.configs.register);
  }

  /**
   * Проверяет rate limit для повторной отправки подтверждения
   */
  async checkResendVerificationLimit(identifier: string): Promise<void> {
    await this.checkLimit(
      'resendVerification',
      identifier,
      this.configs.resendVerification,
    );
  }

  /**
   * Увеличивает счетчик попыток входа
   */
  async incrementLoginAttempts(identifier: string): Promise<void> {
    await this.incrementAttempts('login', identifier, this.configs.login.windowMs);
  }

  /**
   * Очищает счетчик попыток входа (при успешном входе)
   */
  async clearLoginAttempts(identifier: string): Promise<void> {
    await this.cacheService.del(`rate-limit:login:${identifier}`);
  }

  /**
   * Проверяет SMS rate limit:
   * - Максимум 3 отправки в час
   * - Минимум 60 секунд между отправками
   */
  async checkSmsSendLimit(phone: string): Promise<void> {
    const countKey = `sms-send:count:${phone}`;
    const lastSendKey = `sms-send:last:${phone}`;

    // Получаем количество отправок в текущем часовом окне
    const sendCount = (await this.cacheService.get<number>(countKey)) || 0;

    // Проверяем лимит по количеству
    if (sendCount >= this.configs.smsSend.maxAttempts) {
      const ttl = await this.cacheService.getTtl(countKey);
      this.logger.warn(
        `SMS send limit exceeded for ${phone}. Count: ${sendCount}/${this.configs.smsSend.maxAttempts}. TTL: ${ttl}s`,
      );
      const retryAfter = ttl || 300;
      throw new HttpException(
        {
          message: `Превышен лимит запросов. Повторите попытку через ${retryAfter} секунд`,
          retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Проверяем минимальный интервал между отправками
    const lastSendTime = await this.cacheService.get<number>(lastSendKey);
    if (lastSendTime) {
      const timeSinceLastSend = Date.now() - lastSendTime;
      const remainingTime = this.configs.smsSend.minIntervalMs - timeSinceLastSend;

      if (remainingTime > 0) {
        const retryAfterSeconds = Math.ceil(remainingTime / 1000);
        this.logger.warn(
          `SMS cooldown for ${phone}. Please wait ${retryAfterSeconds}s before next send.`,
        );
        throw new HttpException(
          {
            message: `Подождите ${retryAfterSeconds} секунд перед следующей отправкой`,
            retryAfter: retryAfterSeconds,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }
  }

  /**
   * Записывает время отправки SMS и увеличивает счетчик
   */
  async recordSmsSend(phone: string): Promise<void> {
    const countKey = `sms-send:count:${phone}`;
    const lastSendKey = `sms-send:last:${phone}`;

    // Увеличиваем счетчик отправок
    const sendCount = (await this.cacheService.get<number>(countKey)) || 0;
    await this.cacheService.set(
      countKey,
      sendCount + 1,
      Math.ceil(this.configs.smsSend.windowMs / 1000),
    );

    // Записываем время последней отправки
    await this.cacheService.set(
      lastSendKey,
      Date.now(),
      Math.ceil(this.configs.smsSend.minIntervalMs / 1000),
    );

    this.logger.log(`SMS sent to ${phone}. Count: ${sendCount + 1}/${this.configs.smsSend.maxAttempts}`);
  }

  /**
   * Базовая логика проверки rate limit
   */
  private async checkLimit(
    limitType: string,
    identifier: string,
    config: RateLimitConfig,
  ): Promise<void> {
    const key = `rate-limit:${limitType}:${identifier}`;
    const attempts = await this.cacheService.get<number>(key);

    if (attempts && attempts >= config.maxAttempts) {
      // Вычисляем TTL в секундах на основе конфига
      const ttl = Math.ceil(config.windowMs / 1000);
      
      this.logger.warn(
        `Rate limit exceeded for ${limitType} with ${identifier}. Attempts: ${attempts}/${config.maxAttempts}. TTL: ${ttl}s`,
      );
      throw new HttpException(
        {
          message: `Слишком много попыток. Попробуйте позже.`,
          retryAfter: ttl,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  /**
   * Увеличивает счетчик попыток
   */
  private async incrementAttempts(
    limitType: string,
    identifier: string,
    windowMs: number,
  ): Promise<void> {
    const key = `rate-limit:${limitType}:${identifier}`;
    const attempts = (await this.cacheService.get<number>(key)) || 0;

    await this.cacheService.set(key, attempts + 1, Math.ceil(windowMs / 1000));
  }
}
