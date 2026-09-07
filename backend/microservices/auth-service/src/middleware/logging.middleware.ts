import { Injectable, type NestMiddleware } from '@nestjs/common';
import { SharedLoggingMiddleware } from '../../../shared/src/middleware/logging.middleware';

@Injectable()
export class LoggingMiddleware extends SharedLoggingMiddleware implements NestMiddleware {
  protected sanitizeBody(body: unknown): unknown {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const source = body as Record<string, unknown>;
    const masked: Record<string, unknown> = { ...source };
    const sensitiveFields = [
      'password',
      'currentPassword',
      'newPassword',
      'refreshToken',
      'accessToken',
      'token',
      'code',
      'authorization',
      'cookie',
    ];

    for (const field of sensitiveFields) {
      if (field in masked) {
        masked[field] = '***';
      }
    }

    return masked;
  }
}
