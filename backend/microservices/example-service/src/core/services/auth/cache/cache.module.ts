import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { CacheService, REDIS_CLIENT } from './cache.service';

@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (cfg: ConfigService) =>
        new Redis({
          host: cfg.get<string>('REDIS_HOST', 'localhost'),
          port: cfg.get<number>('REDIS_PORT', 6379),
          password: cfg.get<string>('REDIS_PASSWORD') || undefined,
        }),
      inject: [ConfigService],
    },
    CacheService,
  ],
  exports: [CacheService, REDIS_CLIENT],
})
export class CachingModule {}
