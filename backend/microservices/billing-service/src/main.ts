import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { BillingAppModule } from './app.module';
import { setupMetrics } from '../../shared/src/utils/setup-metrics';

async function bootstrap() {
  const app = await NestFactory.create(BillingAppModule);
  app.setGlobalPrefix('api');
  setupMetrics(app);
  const port = Number(process.env.BILLING_SERVICE_PORT || 5004);
  await app.listen(port);
  new Logger('BILLING-Bootstrap').log(`BILLING service started on ${port}`);
}

bootstrap();