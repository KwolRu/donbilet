import { INestApplication, Logger, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { setupMetrics } from './setup-metrics';

// Prisma возвращает поля BigInt (storageUsedBytes, storageQuotaBytes, recordingSizeBytes и т.п.),
// а JSON.stringify не умеет их сериализовать и роняет ответ 500. Учим BigInt отдаваться как
// number (когда влезает в безопасный диапазон) или string (иначе — чтобы не терять точность).
function enableBigIntJsonSerialization(): void {
  const proto = BigInt.prototype as unknown as { toJSON?: () => number | string };
  if (proto.toJSON) {
    return;
  }
  proto.toJSON = function (this: bigint): number | string {
    return this >= BigInt(Number.MIN_SAFE_INTEGER) &&
      this <= BigInt(Number.MAX_SAFE_INTEGER)
      ? Number(this)
      : this.toString();
  };
}

type SetupAppDefaultsOptions = {
  useCookieParser?: boolean;
  metrics?: boolean;
  validation?: {
    whitelist?: boolean;
    forbidNonWhitelisted?: boolean;
    transform?: boolean;
  };
};

export function setupAppDefaults(
  app: INestApplication,
  options: SetupAppDefaultsOptions = {},
): void {
  const {
    useCookieParser: withCookies = false,
    metrics = true,
    validation = {
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    },
  } = options;

  enableBigIntJsonSerialization();

  if (withCookies) {
    app.use(cookieParser());
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: validation.whitelist ?? true,
      forbidNonWhitelisted: validation.forbidNonWhitelisted ?? true,
      transform: validation.transform ?? true,
    }),
  );

  if (metrics) {
    try {
      setupMetrics(app);
    } catch (err) {
      new Logger('Metrics').warn(`Не удалось включить /metrics: ${String(err)}`);
    }
  }
}
