import { INestApplication, Logger } from '@nestjs/common';
import {
  Registry,
  collectDefaultMetrics,
  Histogram,
  Counter,
} from 'prom-client';
import type { Request, Response, NextFunction } from 'express';

/**
 * Подключает Prometheus-метрики к сервису (Фаза 4 мониторинга).
 *
 * Отдаёт GET /metrics (вне глобального префикса /api) со стандартными метриками
 * процесса Node (CPU, память, event loop, GC) + RED-метриками HTTP:
 *   - http_requests_total{method,route,status,service}
 *   - http_request_duration_seconds{method,route,status,service}
 *
 * Label `service` берётся из SERVICE_NAME. Вызывается из setupAppDefaults,
 * поэтому метрики появляются у всех HTTP-сервисов автоматически.
 */
export function setupMetrics(app: INestApplication): void {
  const logger = new Logger('Metrics');
  const serviceName = process.env.SERVICE_NAME || 'unknown';

  let instance: any;
  try {
    instance = app.getHttpAdapter().getInstance();
  } catch {
    instance = undefined;
  }
  if (!instance || typeof instance.use !== 'function') {
    // не HTTP-приложение (например, чисто gRPC) — пропускаем
    return;
  }

  const register = new Registry();
  register.setDefaultLabels({ service: serviceName });
  collectDefaultMetrics({ register });

  const httpDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'Длительность HTTP-запросов в секундах',
    labelNames: ['method', 'route', 'status'],
    buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
    registers: [register],
  });
  const httpTotal = new Counter({
    name: 'http_requests_total',
    help: 'Всего HTTP-запросов',
    labelNames: ['method', 'route', 'status'],
    registers: [register],
  });

  // Измеряем каждый запрос (кроме самого /metrics).
  instance.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path === '/metrics') return next();
    const stop = httpDuration.startTimer();
    res.on('finish', () => {
      // req.route?.path — шаблон маршрута (/users/:id), а не конкретный URL,
      // чтобы не раздувать кардинальность метрик.
      const route =
        (req as any).route?.path || (req as any).baseUrl || 'unmatched';
      const labels = {
        method: req.method,
        route: String(route),
        status: String(res.statusCode),
      };
      stop(labels);
      httpTotal.inc(labels);
    });
    next();
  });

  instance.get('/metrics', async (_req: Request, res: Response) => {
    try {
      res.set('Content-Type', register.contentType);
      res.end(await register.metrics());
    } catch (err) {
      res.status(500).end(String(err));
    }
  });

  logger.log(`Prometheus /metrics включён (service=${serviceName})`);
}
