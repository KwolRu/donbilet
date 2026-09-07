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

  /**
   * Генерирует пару токенов (access + refresh)
   */
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

  /**
   * Генерирует только access token
   */
  generateAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
    const accessPayload = { ...payload, jti: randomUUID() };
    return this.jwtService.sign(accessPayload, {
      expiresIn: this.configService.get('JWT_ACCESS_EXPIRATION', '1h'),
      secret: this.configService.get('JWT_SECRET'),
    });
  }

  /**
   * Генерирует только refresh token
   */
  generateRefreshToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
    return this.jwtService.sign(payload, {
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRATION', '30d'),
      secret: this.configService.get('JWT_SECRET'),
    });
  }

  /**
   * Генерирует токен для восстановления пароля (30 мин)
   */
  generatePasswordResetToken(userId: string, workspaceId: string): string {
    return this.jwtService.sign(
      { userId, workspaceId, type: 'password-reset' },
      {
        expiresIn: this.configService.get('JWT_PASSWORD_RESET_EXPIRATION', '30m'),
        secret: this.configService.get('JWT_SECRET'),
      },
    );
  }

  /**
   * Верифицирует токен и возвращает payload
   */
  verifyToken(token: string): JwtPayload {
    return this.jwtService.verify(token, {
      secret: this.configService.get('JWT_SECRET'),
    });
  }

  /**
   * Декодирует токен без проверки подписи (только для чтения)
   */
  decodeToken(token: string): JwtPayload {
    return this.jwtService.decode(token) as JwtPayload;
  }
}
