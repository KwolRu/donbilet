import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AnalyticsAppModule } from './app.module';
import { setupMetrics } from '../../shared/src/utils/setup-metrics';

async function bootstrap() {
  const app = await NestFactory.create(AnalyticsAppModule);
  app.setGlobalPrefix('api');
  setupMetrics(app);
  const port = Number(process.env.ANALYTICS_SERVICE_PORT || 5005);
  await app.listen(port);
  new Logger('ANALYTICS-Bootstrap').log(`ANALYTICS service started on ${port}`);
}

bootstrap();