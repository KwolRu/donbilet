import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PrismaService } from '../../core/services/prisma/prisma.service';
import { PasswordService } from '../../core/services/auth/password/password.service';
import { TokenService } from '../../core/services/auth/token/token.service';
import { refreshCookieMaxAgeMs } from '../../../../shared/src/auth/auth-token-ttl.util';
import type { TokenPair } from '../../shared/interfaces';
import { RegisterDto, LoginDto } from './dto';

type PublicUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  workspaceId: string;
};

/**
 * Базовая модель авторизации шаблона: email + пароль (Argon2) + workspace,
 * стартовая роль owner. Refresh-токены хранятся хешем в таблице Session и
 * ротируются при каждом обновлении.
 *
 * Расширяется под проект: OTP, инвайты, SSO, несколько ролей. Утилита OTP уже
 * лежит в `shared/src/auth/otp.util.ts`.
 */
@Injectable()
export class AuthService {
  private static readonly ROLE_OWNER = 'owner';

  constructor(
    private readonly prisma: PrismaService,
    private readonly password: PasswordService,
    private readonly token: TokenService,
  ) {}

  private hashRefresh(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private toPublic(user: PublicUser): PublicUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      workspaceId: user.workspaceId,
    };
  }

  private slugify(name: string): string {
    const base = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9а-я]+/gi, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 40);
    return `${base || 'ws'}-${Math.random().toString(36).slice(2, 8)}`;
  }

  async register(dto: RegisterDto): Promise<PublicUser> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Пользователь с таким email уже существует');
    }
    const passwordHash = await this.password.hashPassword(dto.password);

    const user = await this.prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: { slug: this.slugify(dto.workspaceName), name: dto.workspaceName },
      });
      return tx.user.create({
        data: {
          email: dto.email,
          password: passwordHash,
          name: dto.name,
          workspaceId: workspace.id,
        },
      });
    });

    return this.toPublic({ ...user, role: AuthService.ROLE_OWNER, workspaceId: user.workspaceId! });
  }

  async login(
    dto: LoginDto,
    meta: { userAgent?: string; ip?: string } = {},
  ): Promise<{ user: PublicUser } & TokenPair> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !user.workspaceId) {
      throw new UnauthorizedException('Неверный email или пароль');
    }
    const ok = await this.password.comparePassword(dto.password, user.password);
    if (!ok) {
      throw new UnauthorizedException('Неверный email или пароль');
    }

    const tokens = await this.token.generateTokenPair({
      id: user.id,
      workspaceId: user.workspaceId,
      role: AuthService.ROLE_OWNER,
      email: user.email,
    });

    await this.prisma.session.create({
      data: {
        userId: user.id,
        refreshHash: this.hashRefresh(tokens.refreshToken),
        userAgent: meta.userAgent,
        ip: meta.ip,
        expiresAt: new Date(Date.now() + refreshCookieMaxAgeMs()),
      },
    });

    return {
      user: this.toPublic({ ...user, role: AuthService.ROLE_OWNER, workspaceId: user.workspaceId }),
      ...tokens,
    };
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token отсутствует');
    }
    let payload;
    try {
      payload = this.token.verifyToken(refreshToken);
    } catch {
      throw new UnauthorizedException('Невалидный refresh token');
    }

    const hash = this.hashRefresh(refreshToken);
    const session = await this.prisma.session.findFirst({
      where: { userId: payload.id, refreshHash: hash, revokedAt: null },
    });
    if (!session || session.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Сессия недействительна');
    }

    const tokens = await this.token.generateTokenPair({
      id: payload.id,
      workspaceId: payload.workspaceId,
      role: payload.role,
      email: payload.email,
    });

    // Ротация: старую сессию отзываем, создаём новую.
    await this.prisma.$transaction([
      this.prisma.session.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      }),
      this.prisma.session.create({
        data: {
          userId: payload.id,
          refreshHash: this.hashRefresh(tokens.refreshToken),
          userAgent: session.userAgent,
          ip: session.ip,
          expiresAt: new Date(Date.now() + refreshCookieMaxAgeMs()),
        },
      }),
    ]);

    return tokens;
  }

  async logout(refreshToken?: string): Promise<void> {
    if (!refreshToken) return;
    await this.prisma.session.updateMany({
      where: { refreshHash: this.hashRefresh(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async logoutAll(userId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
