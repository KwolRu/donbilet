import { Module } from '@nestjs/common';
import { BillingHealthController } from './health.controller';
import { BillingHealthService } from './health.service';

@Module({
  controllers: [BillingHealthController],
  providers: [BillingHealthService],
})
export class BillingHealthModule {}
