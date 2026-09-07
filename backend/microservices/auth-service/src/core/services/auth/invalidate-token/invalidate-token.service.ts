import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CacheService } from '../cache/cache.service';

@Injectable()
export class InvalidateTokenService {
  constructor(
    private readonly cacheService: CacheService,
    private readonly jwtService: JwtService,
  ) {}

  async invalidateToken(token: string): Promise<void> {
    const decoded: any = this.jwtService.decode(token);
    if (decoded?.exp) {
      const ttl = decoded.exp - Math.floor(Date.now() / 1000);
      if (ttl > 0) await this.cacheService.set(token, 'invalid', ttl);
    }
  }

  async isTokenInvalidated(token: string): Promise<boolean> {
    return (await this.cacheService.get<string>(token)) === 'invalid';
  }
}
