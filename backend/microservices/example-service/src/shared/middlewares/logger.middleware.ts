import { Injectable, type NestMiddleware } from '@nestjs/common';
import { maskSensitiveFields } from '../constants';
import { SharedLoggingMiddleware } from '../../../../shared/src/middleware/logging.middleware';

@Injectable()
export class LoggingMiddleware extends SharedLoggingMiddleware implements NestMiddleware {
  protected sanitizeBody(body: unknown): unknown {
    if (!body || typeof body !== 'object') {
      return body;
    }
    return maskSensitiveFields(body as Record<string, any>);
  }
}
