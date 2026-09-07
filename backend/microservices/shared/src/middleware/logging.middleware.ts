import { Injectable, Logger, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

@Injectable()
export class SharedLoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  protected sanitizeBody(body: unknown): unknown {
    return body;
  }

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl, body } = req;
    const startedAt = Date.now();

    if (body && typeof body === 'object' && Object.keys(body as Record<string, unknown>).length > 0) {
      this.logger.debug(`Body: ${JSON.stringify(this.sanitizeBody(body))}`);
    }

    res.on('finish', () => {
      const duration = Date.now() - startedAt;
      this.logger.log(`${method} ${originalUrl} ${res.statusCode} - ${duration}ms`);
    });

    next();
  }
}
