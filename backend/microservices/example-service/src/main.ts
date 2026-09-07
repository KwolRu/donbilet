import 'dotenv/config';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AllExceptionFilter } from './shared/filters/all-exception.filter';
import { setupSwagger } from './core/config/swagger.config';
import { HealthCheckService } from './modules/health/health.service';
import { ExampleAppModule } from './app.module';
import { setupAppDefaults } from '../../shared/src/utils/setup-app-defaults';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(ExampleAppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });
  const logger = new Logger('Example-Bootstrap');

  // Сервис не стартует с недоступной БД/Redis — падаем громко, а не отдаём 500 в рантайме.
  const healthCheckService = app.get(HealthCheckService);
  const health = await healthCheckService.checkAll();

  if (health.status === 'unhealthy') {
    logger.error('❌ Startup failed — зависимости недоступны.');
    logger.error(JSON.stringify(health, null, 2));
    process.exit(1);
  }

  logger.log('✅ Health check passed');

  app.useBodyParser('json', { limit: '10mb' });
  setupAppDefaults(app, { useCookieParser: true });
  app.useGlobalFilters(new AllExceptionFilter());

  app.use((req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = function (body: unknown) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return originalJson(body);
    };
    next();
  });

  setupSwagger(app);
  app.setGlobalPrefix('api');

  const port = Number(process.env.EXAMPLE_SERVICE_PORT || 5001);
  await app.listen(port);

  logger.log('='.repeat(60));
  logger.log('🚀 Example service started');
  logger.log(`📍 URL: http://localhost:${port}/api`);
  logger.log(`📚 Swagger: http://localhost:${port}/api/docs`);
  logger.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.log('='.repeat(60));
}

bootstrap().catch((error) => {
  const logger = new Logger('Example-Bootstrap');
  logger.error('❌ Failed to start example service', error.stack);
  process.exit(1);
});
