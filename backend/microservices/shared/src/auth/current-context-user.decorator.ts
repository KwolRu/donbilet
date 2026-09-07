import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Под каким ключом guard кладёт проверенный payload в request.
 * Добавляя роль со своим guard'ом (например, платформенный админ), расширяйте union.
 */
export type RequestUserKey = 'user' | 'owner' | 'superadmin';

export function readContextUser(request: any, key: RequestUserKey = 'user') {
  return request?.[key];
}

export const CurrentContextUser = createParamDecorator(
  (key: RequestUserKey = 'user', ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return readContextUser(request, key);
  },
);
