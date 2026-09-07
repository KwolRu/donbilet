import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { readContextUser } from '../../../../shared/src/auth/current-context-user.decorator';
import type { JwtPayload } from '../interfaces';

export const CurrentUser = createParamDecorator((_d: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return readContextUser(request, 'user') as JwtPayload;
});
