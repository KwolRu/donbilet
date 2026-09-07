import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { CacheService } from '../auth/cache/cache.service';

interface RateLimitConfig {
  windowMs: number;
  maxAttempts: number;
}

@Injectable()
export class RateLimitService {
  private logger = new Logger(RateLimitService.name);
  private readonly configs = {
    login: { windowMs: 15 * 60 * 1000, maxAttempts: 10 },
    register: { windowMs: 60 * 60 * 1000, maxAttempts: 20 },
    resendVerification: { windowMs: 60 * 60 * 1000, maxAttempts: 10 },
    smsSend: { windowMs: 5 * 60 * 1000, maxAttempts: 3, minIntervalMs: 30 * 1000 },
  };

  constructor(private cacheService: CacheService) {}
  async checkLoginLimit(identifier: string) { await this.checkLimit('login', identifier, this.configs.login); }
  async checkRegisterLimit(identifier: string) { await this.checkLimit('register', identifier, this.configs.register); }
  async checkResendVerificationLimit(identifier: string) { await this.checkLimit('resendVerification', identifier, this.configs.resendVerification); }
  async incrementLoginAttempts(identifier: string) { await this.incrementAttempts('login', identifier, this.configs.login.windowMs); }
  async clearLoginAttempts(identifier: string) { await this.cacheService.del(`rate-limit:login:${identifier}`); }
  async checkSmsSendLimit(phone: string) {
    const countKey = `sms-send:count:${phone}`;
    const lastSendKey = `sms-send:last:${phone}`;
    const sendCount = (await this.cacheService.get<number>(countKey)) || 0;
    if (sendCount >= this.configs.smsSend.maxAttempts) {
      const retryAfter = (await this.cacheService.getTtl(countKey)) || 300;
      throw new HttpException({ message: `Превышен лимит запросов. Повторите попытку через ${retryAfter} секунд`, retryAfter }, HttpStatus.TOO_MANY_REQUESTS);
    }
    const lastSendTime = await this.cacheService.get<number>(lastSendKey);
    if (lastSendTime) {
      const remaining = this.configs.smsSend.minIntervalMs - (Date.now() - lastSendTime);
      if (remaining > 0) {
        const retryAfter = Math.ceil(remaining / 1000);
        throw new HttpException({ message: `Подождите ${retryAfter} секунд перед следующей отправкой`, retryAfter }, HttpStatus.TOO_MANY_REQUESTS);
      }
    }
  }
  async recordSmsSend(phone: string) {
    const countKey = `sms-send:count:${phone}`;
    const lastSendKey = `sms-send:last:${phone}`;
    const sendCount = (await this.cacheService.get<number>(countKey)) || 0;
    await this.cacheService.set(countKey, sendCount + 1, Math.ceil(this.configs.smsSend.windowMs / 1000));
    await this.cacheService.set(lastSendKey, Date.now(), Math.ceil(this.configs.smsSend.minIntervalMs / 1000));
    this.logger.log(`SMS sent to ${phone}. Count: ${sendCount + 1}/${this.configs.smsSend.maxAttempts}`);
  }
  private async checkLimit(limitType: string, identifier: string, config: RateLimitConfig) {
    const attempts = await this.cacheService.get<number>(`rate-limit:${limitType}:${identifier}`);
    if (attempts && attempts >= config.maxAttempts) {
      throw new HttpException({ message: 'Слишком много попыток. Попробуйте позже.', retryAfter: Math.ceil(config.windowMs / 1000) }, HttpStatus.TOO_MANY_REQUESTS);
    }
  }
  private async incrementAttempts(limitType: string, identifier: string, windowMs: number) {
    const key = `rate-limit:${limitType}:${identifier}`;
    const attempts = (await this.cacheService.get<number>(key)) || 0;
    await this.cacheService.set(key, attempts + 1, Math.ceil(windowMs / 1000));
  }
}
