import type { Request } from 'express';

/**
 * Returns access token from Authorization header (Bearer) or fallback cookie.
 */
export function getAccessTokenFromRequest(
  req: Request,
  cookieName: string,
): string | undefined {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const [scheme, token] = authHeader.split(' ');
    if (scheme === 'Bearer' && token) {
      return token;
    }
  }

  return req.cookies?.[cookieName] as string | undefined;
}
