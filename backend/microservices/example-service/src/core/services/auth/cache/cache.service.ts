import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Injectable()
export class CacheService implements OnModuleDestroy {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async onModuleDestroy(): Promise<void> {
    try {
      await this.redis.quit();
    } catch {
      // ignore — already closed
    }
  }

  async get<T>(key: string): Promise<T | undefined> {
    const raw = await this.redis.get(key);
    if (raw == null) return undefined;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return raw as unknown as T;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const payload = JSON.stringify(value);
    if (ttl && ttl > 0) {
      await this.redis.set(key, payload, 'EX', ttl);
    } else {
      await this.redis.set(key, payload);
    }
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async ttl(key: string): Promise<number> {
    const value = await this.get(key);
    return value != null ? 0 : -1;
  }

  async getTtl(key: string): Promise<number> {
    const ttl = await this.redis.ttl(key);
    return ttl < 0 ? 0 : ttl;
  }

  async deleteByPrefix(prefix: string): Promise<number> {
    const pattern = `${prefix}*`;
    let cursor = '0';
    let deleted = 0;
    do {
      const [next, keys] = await this.redis.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        200,
      );
      cursor = next;
      if (keys.length > 0) {
        deleted += await this.redis.del(...keys);
      }
    } while (cursor !== '0');
    return deleted;
  }
}
