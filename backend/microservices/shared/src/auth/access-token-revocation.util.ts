import { accessTokenBlacklistTtlSeconds, type TokenDecoder } from './access-token-blacklist-ttl.util';

export interface KeyValueCache {
  set(key: string, value: unknown, ttlSeconds?: number): Promise<unknown>;
  get<T>(key: string): Promise<T | undefined>;
}

export async function revokeAccessTokenInCache(
  accessToken: string,
  tokenService: TokenDecoder,
  cacheService: KeyValueCache,
): Promise<void> {
  const decoded = tokenService.decodeToken(accessToken) as { jti?: string };
  if (!decoded?.jti) {
    return;
  }

  const ttl = accessTokenBlacklistTtlSeconds(accessToken, tokenService);
  await cacheService.set(`jti-blacklist:${decoded.jti}`, true, ttl);
}

/**
 * Should be used only after successful JWT verify.
 */
export async function isAccessTokenRevoked(
  _rawToken: string,
  payload: { jti?: string },
  cacheService: Pick<KeyValueCache, 'get'>,
): Promise<boolean> {
  if (!payload.jti) {
    return true;
  }
  return Boolean(await cacheService.get<boolean>(`jti-blacklist:${payload.jti}`));
}
