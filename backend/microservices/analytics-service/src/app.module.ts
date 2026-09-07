import { Module } from '@nestjs/common';
import { AnalyticsHealthModule } from './modules/health/health.module';

@Module({
  imports: [AnalyticsHealthModule],
})
export class AnalyticsAppModule {}