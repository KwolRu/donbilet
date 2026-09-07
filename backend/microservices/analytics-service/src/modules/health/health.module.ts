import { Module } from '@nestjs/common';
import { AnalyticsHealthController } from './health.controller';
import { AnalyticsHealthService } from './health.service';

@Module({
  controllers: [AnalyticsHealthController],
  providers: [AnalyticsHealthService],
})
export class AnalyticsHealthModule {}
