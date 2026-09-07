import {
  Injectable,
} from '@nestjs/common';
import { BaseTokenGuard } from '../../../../shared/src/auth/base-token.guard';
import { TokenService } from '../../core/services/auth/token/token.service';
import { CacheService } from '../../core/services/auth/cache/cache.service';
import type { JwtPayload } from '../interfaces';
import { getAccessTokenFromRequest } from '../../../../shared/src/auth/access-token-from-request.util';
import { isAccessTokenRevoked } from '../../../../shared/src/auth/access-token-revocation.util';
import { AUTH_COOKIE_NAMES } from '../../../../shared/src/auth/auth-cookie-names.constants';

@Injectable()
export class JwtAuthGuard extends BaseTokenGuard<JwtPayload> {
  constructor(
    private tokenService: TokenService,
    private cacheService: CacheService,
  ) {
    super();
  }

  protected getToken(request: any): string | undefined {
    return getAccessTokenFromRequest(request, AUTH_COOKIE_NAMES.access);
  }

  protected verifyToken(token: string): JwtPayload {
    return this.tokenService.verifyToken(token) as JwtPayload;
  }

  protected isRevoked(token: string, payload: JwtPayload): Promise<boolean> {
    return isAccessTokenRevoked(token, payload, this.cacheService);
  }

  protected attachPayload(request: any, payload: JwtPayload): void {
    request.user = payload;
  }
}
