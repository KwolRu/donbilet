import { ForbiddenException, Injectable, Logger, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

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

function parseOriginFromRequest(req: Request): string | null {
  const origin = req.headers.origin;
  if (typeof origin === 'string' && origin.trim()) {
    return origin.trim();
  }

  const referer = req.headers.referer;
  if (typeof referer === 'string' && referer.trim()) {
    try {
      return new URL(referer).origin;
    } catch {
      return null;
    }
  }

  return null;
}

@Injectable()
export class OriginCheckMiddleware implements NestMiddleware {
  private readonly logger = new Logger(OriginCheckMiddleware.name);

  use(req: Request, _res: Response, next: NextFunction): void {
    if (!MUTATING_METHODS.has(req.method)) {
      next();
      return;
    }

    const origin = parseOriginFromRequest(req);
    if (!origin) {
      // Non-browser clients may not send Origin/Referer.
      next();
      return;
    }

    if (this.isAllowedOrigin(origin)) {
      next();
      return;
    }

    this.logger.warn(
      `Rejected by origin check: method=${req.method} path=${req.originalUrl} origin=${origin}`,
    );
    throw new ForbiddenException('Origin is not allowed');
  }

  private isAllowedOrigin(origin: string): boolean {
    const mainDomain = normalizeHostname(process.env.APP_MAIN_DOMAIN || 'localhost');
    const allowedOrigins = (process.env.CORS_ORIGIN || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    if (allowedOrigins.includes(origin)) {
      return true;
    }

    try {
      const parsed = new URL(origin);
      const hostname = normalizeHostname(parsed.hostname);

      if (isLocalDevHostname(hostname)) {
        return true;
      }

      return hostname === mainDomain || hostname.endsWith(`.${mainDomain}`);
    } catch {
      return false;
    }
  }
}
