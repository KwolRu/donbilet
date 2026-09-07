import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { JwtPayload } from '../interfaces';
import { readContextUser } from '../../../../shared/src/auth/current-context-user.decorator';

/**
 * Декоратор для получения текущего пользователя из запроса
 * Использование: @CurrentUser() user: JwtPayload
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return readContextUser(request, 'user') as JwtPayload;
  },
);
