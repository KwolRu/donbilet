import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/services/prisma/prisma.service';
import { CacheService } from '../../core/services/auth/cache/cache.service';

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  services: {
    database: { status: 'up' | 'down'; message: string };
    redis: { status: 'up' | 'down'; message: string };
  };
}

@Injectable()
export class HealthCheckService {
  private readonly logger = new Logger(HealthCheckService.name);

  constructor(
    private prismaService: PrismaService,
    private cacheService: CacheService,
  ) {}

  async checkAll(): Promise<HealthCheckResult> {
    const [dbStatus, redisStatus] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
    ]);

    const isHealthy =
      dbStatus.status === 'up' && redisStatus.status === 'up';

    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        database: dbStatus,
        redis: redisStatus,
      },
    };
  }

  private async checkDatabase(): Promise<{ status: 'up' | 'down'; message: string }> {
    try {
      await this.prismaService.$queryRaw`SELECT 1`;
      this.logger.log('✅ Database connection OK');
      return {
        status: 'up',
        message: 'Database is connected and responding',
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`❌ Database connection failed: ${message}`);
      return {
        status: 'down',
        message: `Database connection failed: ${message}`,
      };
    }
  }

  private async checkRedis(): Promise<{ status: 'up' | 'down'; message: string }> {
    try {
      // Try to set and get a test key
      const testKey = '__health_check__';
      await this.cacheService.set(testKey, { test: true }, 1);
      const result = await this.cacheService.get(testKey);

      if (result) {
        this.logger.log('✅ Redis connection OK');
        return {
          status: 'up',
          message: 'Redis is connected and responding',
        };
      } else {
        throw new Error('Redis test key not found');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`❌ Redis connection failed: ${message}`);
      return {
        status: 'down',
        message: `Redis connection failed: ${message}`,
      };
    }
  }
}
