import 'dotenv/config';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { GatewayAppModule } from './app.module';
import { setupAppDefaults } from '../../shared/src/utils/setup-app-defaults';

function normalizeHostname(hostname: string): string {
  return hostname.trim().toLowerCase();
}

function isLocalDevHostname(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname.endsWith('.localhost')
  );
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(GatewayAppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    rawBody: true,
  });

  app.useBodyParser('json', { limit: '10mb' });
  const logger = new Logger('Gateway-Bootstrap');

  // Set global prefix for all routes
  app.setGlobalPrefix('api');

  setupAppDefaults(app);

  const mainDomain = normalizeHostname(
    process.env.APP_MAIN_DOMAIN || 'localhost',
  );
  const allowedOrigins = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  // Enable CORS for Frontend
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      try {
        const parsed = new URL(origin);
        const hostname = normalizeHostname(parsed.hostname);

        if (isLocalDevHostname(hostname)) {
          callback(null, true);
          return;
        }

        if (hostname === mainDomain || hostname.endsWith(`.${mainDomain}`)) {
          callback(null, true);
          return;
        }
      } catch {
        // invalid origin URL
      }

      callback(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders:
      'Content-Type,Authorization,' +
      'X-Multipart-Key,X-Multipart-Upload-Id,X-Multipart-Part-Number',
    exposedHeaders: 'Authorization,ETag',
  });

  const port = Number(process.env.GATEWAY_PORT || 5000);
  await app.listen(port);

  logger.log('='.repeat(60));
  logger.log(`🚀 Gateway started successfully`);
  logger.log(`📍 Base URL: http://localhost:${port}`);
  logger.log(`📍 API URL: http://localhost:${port}/api`);
  logger.log(`🌐 CORS allowlist: ${allowedOrigins.join(', ') || '(none)'}`);
  logger.log(`🌐 CORS domain wildcard: *.${mainDomain} + ${mainDomain}`);
  logger.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.log('='.repeat(60));
  logger.log(`💡 Frontend should use: http://localhost:${port}`);
  logger.log(`💡 Requests will be: http://localhost:${port}/api/...`);
  logger.log('='.repeat(60));
}

bootstrap().catch((error) => {
  const logger = new Logger('Gateway-Bootstrap');
  logger.error('❌ Failed to start Gateway', error);
  process.exit(1);
});
