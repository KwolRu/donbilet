import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CookieOptions, Response } from 'express';
import { isDev } from '../../../../../../shared/src/utils/is-dev.util';
import { AUTH_COOKIE_NAMES } from '../../../../../../shared/src/auth/auth-cookie-names.constants';
import {
  accessCookieMaxAgeMs,
  refreshCookieMaxAgeMs,
} from '../../../../../../shared/src/auth/auth-token-ttl.util';

/**
 * Выдача сессии через httpOnly-cookies.
 *
 * Токены НЕ отдаются клиентскому JS: и access, и refresh живут в httpOnly —
 * это снимает целый класс атак с угоном токена из localStorage. Фронт про
 * значения токенов не знает, ему достаточно `withCredentials: true`.
 *
 * `sameSite: 'lax'` — рабочий компромисс: cookie уходит при обычной навигации,
 * но не при cross-site POST (базовая защита от CSRF). Если фронт и API окажутся
 * на разных доменах, потребуется `sameSite: 'none'` + `secure: true`.
 */
@Injectable()
export class CookieService {
  private readonly cookieDomain: string;

  constructor(private readonly configService: ConfigService) {
    this.cookieDomain = this.configService.getOrThrow<string>('COOKIE_DOMAIN');
  }

  private baseOptions(): CookieOptions {
    return {
      httpOnly: true,
      domain: this.cookieDomain,
      // В dev по http secure-cookie браузер просто не сохранит.
      secure: !isDev(this.configService),
      sameSite: 'lax',
      path: '/',
    };
  }

  /** Ставит обе cookie после login/register/refresh. */
  setSession(res: Response, tokens: { accessToken: string; refreshToken: string }) {
    res.cookie(AUTH_COOKIE_NAMES.access, tokens.accessToken, {
      ...this.baseOptions(),
      maxAge: accessCookieMaxAgeMs(),
    });

    res.cookie(AUTH_COOKIE_NAMES.refresh, tokens.refreshToken, {
      ...this.baseOptions(),
      maxAge: refreshCookieMaxAgeMs(),
    });
  }

  /** Сбрасывает сессию. Атрибуты должны совпадать с выданными, иначе браузер не удалит cookie. */
  clearSession(res: Response) {
    const options = this.baseOptions();
    res.clearCookie(AUTH_COOKIE_NAMES.access, options);
    res.clearCookie(AUTH_COOKIE_NAMES.refresh, options);
  }
}
