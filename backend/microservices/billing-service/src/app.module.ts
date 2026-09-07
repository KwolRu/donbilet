import { Module } from '@nestjs/common';
import { BillingHealthModule } from './modules/health/health.module';

@Module({
  imports: [BillingHealthModule],
})
export class BillingAppModule {}