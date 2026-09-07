import { Logger, LogLevel } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NotificationAppModule } from './app.module';
import { setupMetrics } from '../../shared/src/utils/setup-metrics';

async function bootstrap() {
  // В проде не пишем debug/verbose — иначе раздувается объём логов в Loki.
  const logLevels: LogLevel[] =
    process.env.NODE_ENV === 'production'
      ? ['error', 'warn', 'log']
      : ['error', 'warn', 'log', 'debug', 'verbose'];
  const app = await NestFactory.create(NotificationAppModule, { logger: logLevels });
  const logger = new Logger('Notification-Bootstrap');
  
  app.setGlobalPrefix('api');
  setupMetrics(app);

  const port = Number(process.env.NOTIFICATION_SERVICE_PORT || 5006);
  await app.listen(port);
  
  logger.log('='.repeat(60));
  logger.log(`🚀 Notification Service started successfully`);
  logger.log(`📍 URL: http://localhost:${port}/api`);
  logger.log(`📧 Email: ${process.env.MAIL_HOST || 'not configured'}`);
  logger.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.log('='.repeat(60));

  const shutdown = async () => {
    logger.log('⏹️  Shutting down notification service...');
    await app.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

bootstrap().catch((error) => {
  const logger = new Logger('Notification-Bootstrap');
  logger.error('❌ Failed to start notification service', error.stack);
  process.exit(1);
});
