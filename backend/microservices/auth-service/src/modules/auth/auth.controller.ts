import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, RefreshDto } from './dto';
import { JwtAuthGuard } from '../../shared/guards';
import { CurrentUser } from '../../shared/decorators';
import type { JwtPayload } from '../../shared/interfaces';
import { AUTH_ROUTES } from '../../core/config/routes';
import { CookieService } from '../../core/services/auth/cookie/cookie.service';
import { extractTokenFromCookieHeader } from '../../../../shared/src/auth';
import { AUTH_COOKIE_NAMES } from '../../../../shared/src/auth/auth-cookie-names.constants';

/**
 * Сессия выдаётся httpOnly-cookies (см. CookieService). Токены дополнительно
 * возвращаются в теле — для не-браузерных клиентов; браузерному фронту тело
 * не нужно, он полагается на cookies и `withCredentials: true`.
 *
 * `passthrough: true` у @Res обязателен: без него Nest перестаёт сериализовать
 * возвращаемое значение, и ответ уходит пустым.
 */
@ApiTags('Authentication')
@Controller(AUTH_ROUTES.ROOT)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly cookieService: CookieService,
  ) {}

  private resolveRefreshToken(req: ExpressRequest, bodyToken?: string): string | undefined {
    if (bodyToken) return bodyToken;
    const cookieHeader = Array.isArray(req.headers.cookie)
      ? req.headers.cookie.join('; ')
      : (req.headers.cookie as string | undefined);
    return extractTokenFromCookieHeader(cookieHeader, [AUTH_COOKIE_NAMES.refresh]);
  }

  @Post(AUTH_ROUTES.REGISTER)
  @HttpCode(HttpStatus.CREATED)
  register(@Body() dto: RegisterDto) {
    // Регистрация не логинит: пользователь проходит обычный вход и получает
    // сессию там. Так один путь выдачи токенов вместо двух.
    return this.authService.register(dto);
  }

  @Post(AUTH_ROUTES.LOGIN)
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Req() req: ExpressRequest,
    @Res({ passthrough: true }) res: ExpressResponse,
  ) {
    const result = await this.authService.login(dto, {
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    });

    this.cookieService.setSession(res, result);
    return result;
  }

  @Post(AUTH_ROUTES.REFRESH)
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() dto: RefreshDto,
    @Req() req: ExpressRequest,
    @Res({ passthrough: true }) res: ExpressResponse,
  ) {
    const tokens = await this.authService.refresh(
      this.resolveRefreshToken(req, dto.refreshToken) ?? '',
    );

    this.cookieService.setSession(res, tokens);
    return tokens;
  }

  @Post(AUTH_ROUTES.LOGOUT)
  @HttpCode(HttpStatus.OK)
  async logout(
    @Body() dto: RefreshDto,
    @Req() req: ExpressRequest,
    @Res({ passthrough: true }) res: ExpressResponse,
  ) {
    await this.authService.logout(this.resolveRefreshToken(req, dto.refreshToken));
    this.cookieService.clearSession(res);
    return { ok: true };
  }

  @Post(AUTH_ROUTES.LOGOUT_ALL)
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async logoutAll(
    @CurrentUser() user: JwtPayload,
    @Res({ passthrough: true }) res: ExpressResponse,
  ) {
    await this.authService.logoutAll(user.id);
    this.cookieService.clearSession(res);
    return { ok: true };
  }
}
