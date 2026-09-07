import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { setupAppDefaults } from '../../shared/src/utils/setup-app-defaults';
import { AuthAppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AuthAppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });
  const logger = new Logger('AUTH-Bootstrap');

  setupAppDefaults(app, { useCookieParser: true });
  app.setGlobalPrefix('api');

  const port = Number(process.env.AUTH_SERVICE_PORT || 5007);
  await app.listen(port);

  logger.log('='.repeat(60));
  logger.log('🚀 Auth Service started successfully');
  logger.log(`📍 URL: http://localhost:${port}/api`);
  logger.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.log('='.repeat(60));
}

bootstrap().catch((error) => {
  const logger = new Logger('AUTH-Bootstrap');
  logger.error('❌ Failed to start Auth service', error.stack);
  process.exit(1);
});
