import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

import {
  JwtValidator,
  JwtValidationError,
  extractTokenFromAuthHeader,
  extractTokenFromCookieHeader,
  type VerifiedActor,
} from '../../../../shared/src/auth';

// Trust-заголовки, проставляемые gateway. Входящие одноимённые всегда затираются.
const ACTOR_HEADERS = [
  'x-actor-id',
  'x-actor-user-id',
  'x-actor-role',
  'x-workspace-id',
] as const;

export type AttachedActor = {
  verified: VerifiedActor;
  userId: string;
  workspaceId: string;
};

declare module 'express-serve-static-core' {
  interface Request {
    actor?: AttachedActor;
  }
}

/**
 * Actor-auth: верифицирует JWT и проставляет trust-заголовки для доменных сервисов
 * (`x-actor-*`, `x-workspace-id`). Это ЕДИНСТВЕННОЕ место, где проверяется подпись
 * токена — доменные сервисы доверяют заголовкам и не знают про JWT_SECRET.
 *
 * Отсюда следует: доменные сервисы не должны быть доступны снаружи docker-сети.
 * См. docs/adr/ADR-0002-tenancy-workspace-isolation.md.
 */
@Injectable()
export class ActorAuthMiddleware implements NestMiddleware {
  private readonly logger = new Logger(ActorAuthMiddleware.name);
  private readonly validator = new JwtValidator({
    secret: process.env.JWT_SECRET ?? '',
  });

  use(req: Request, _res: Response, next: NextFunction): void {
    for (const h of ACTOR_HEADERS) {
      if (req.headers[h] !== undefined) delete req.headers[h];
    }

    const cookieHeader = Array.isArray(req.headers.cookie)
      ? req.headers.cookie.join('; ')
      : (req.headers.cookie as string | undefined);
    const token =
      extractTokenFromCookieHeader(cookieHeader) ??
      extractTokenFromAuthHeader(
        Array.isArray(req.headers.authorization)
          ? req.headers.authorization[0]
          : req.headers.authorization,
      );

    if (!token) {
      return next();
    }

    let verified: VerifiedActor;
    try {
      verified = this.validator.verify(token);
    } catch (e) {
      if (e instanceof JwtValidationError) {
        return next();
      }
      this.logger.warn(`Unexpected JWT verify error: ${(e as Error).message}`);
      return next();
    }

    req.actor = { verified, userId: verified.id, workspaceId: verified.workspaceId };

    req.headers['x-actor-id'] = verified.id;
    req.headers['x-actor-user-id'] = verified.id;
    req.headers['x-actor-role'] = verified.role || '';
    req.headers['x-workspace-id'] = verified.workspaceId;

    return next();
  }
}
