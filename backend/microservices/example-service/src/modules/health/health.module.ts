import { Module } from '@nestjs/common';
import { HealthCheckService } from './health.service';
import { HealthCheckController } from './health.controller';
import { PrismaModule } from '../../core/services/prisma/prisma.module';
import { CachingModule } from '../../core/services/auth/cache/cache.module';

@Module({
  imports: [PrismaModule, CachingModule],
  controllers: [HealthCheckController],
  providers: [HealthCheckService],
  exports: [HealthCheckService],
})
export class HealthCheckModule {}
