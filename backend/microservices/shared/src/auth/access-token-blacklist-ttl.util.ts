export interface TokenDecoder {
  decodeToken(token: string): unknown;
}

/**
 * Blacklist TTL for access token revocation.
 * Uses token exp claim (minimum 60s), falls back to 1h.
 */
export function accessTokenBlacklistTtlSeconds(
  accessToken: string,
  tokenService: TokenDecoder,
): number {
  try {
    const decoded = tokenService.decodeToken(accessToken) as { exp?: number };
    if (decoded?.exp) {
      const secLeft = Math.ceil(decoded.exp - Date.now() / 1000);
      return Math.max(60, secLeft);
    }
  } catch {
    // ignore decode failures and fallback to default ttl
  }
  return 60 * 60;
}
