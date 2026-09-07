import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import type { JwtPayload, TokenPair } from '../../../../shared/interfaces';

@Injectable()
export class TokenService {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async generateTokenPair(payload: Omit<JwtPayload, 'iat' | 'exp'>): Promise<TokenPair> {
    const accessPayload = { ...payload, jti: randomUUID() };
    const accessToken = this.jwtService.sign(accessPayload, {
      expiresIn: this.configService.get('JWT_ACCESS_EXPIRATION', '1h'),
      secret: this.configService.get('JWT_SECRET'),
    });
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRATION', '30d'),
      secret: this.configService.get('JWT_SECRET'),
    });
    return { accessToken, refreshToken };
  }

  verifyToken(token: string): JwtPayload {
    return this.jwtService.verify(token, { secret: this.configService.get('JWT_SECRET') });
  }

  decodeToken(token: string): JwtPayload {
    return this.jwtService.decode(token) as JwtPayload;
  }
}
