import { verify, type VerifyErrors } from 'jsonwebtoken';
import { AUTH_COOKIE_NAMES } from './auth-cookie-names.constants';
import type { JwtPayload, VerifiedActor } from './jwt.types';

export class JwtValidationError extends Error {
  constructor(
    message: string,
    public readonly code: 'missing' | 'expired' | 'invalid' = 'invalid',
  ) {
    super(message);
    this.name = 'JwtValidationError';
  }
}

export interface JwtValidatorOptions {
  secret: string;
}

/**
 * Лёгкий JWT-валидатор для сервисов, которые НЕ хотят тащить passport/Nest guards
 * (например, gRPC-контекст или WS-upgrade на gateway).
 */
export class JwtValidator {
  constructor(private readonly options: JwtValidatorOptions) {
    if (!options.secret) {
      throw new Error('JWT_SECRET is required for JwtValidator');
    }
  }

  verify(token: string | undefined | null): VerifiedActor {
    if (!token || token.trim().length === 0) {
      throw new JwtValidationError('Token is missing', 'missing');
    }
    let payload: JwtPayload;
    try {
      payload = verify(token, this.options.secret) as JwtPayload;
    } catch (e) {
      const err = e as VerifyErrors;
      if (err.name === 'TokenExpiredError') {
        throw new JwtValidationError('Token expired', 'expired');
      }
      throw new JwtValidationError('Invalid token', 'invalid');
    }

    if (!payload || typeof payload !== 'object') {
      throw new JwtValidationError('Invalid token payload', 'invalid');
    }

    if (!payload.id || !payload.workspaceId) {
      throw new JwtValidationError('Token missing required claims', 'invalid');
    }

    return {
      id: payload.id,
      workspaceId: payload.workspaceId,
      role: payload.role ?? '',
      raw: payload,
    };
  }
}

export const DEFAULT_ACCESS_COOKIE_PRIORITY: readonly string[] = Object.freeze([
  AUTH_COOKIE_NAMES.access,
]);

function parseCookieHeader(cookieHeader: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const part of cookieHeader.split(';')) {
    const eqIdx = part.indexOf('=');
    if (eqIdx === -1) continue;
    const name = part.slice(0, eqIdx).trim();
    if (!name || map.has(name)) continue;
    const value = part.slice(eqIdx + 1).trim();
    if (value.length > 0) map.set(name, value);
  }
  return map;
}

export function extractTokenFromCookieHeader(
  cookieHeader: string | undefined,
  names: readonly string[] = DEFAULT_ACCESS_COOKIE_PRIORITY,
): string | undefined {
  if (!cookieHeader) return undefined;
  const cookies = parseCookieHeader(cookieHeader);
  for (const name of names) {
    const value = cookies.get(name);
    if (value && value.length > 0) return value;
  }
  return undefined;
}

export function extractTokenFromAuthHeader(authHeader: string | undefined): string | undefined {
  if (!authHeader) return undefined;
  const [scheme, value] = authHeader.split(' ');
  if (scheme === 'Bearer' && value) return value;
  return undefined;
}
