import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ANY_PERMISSION_KEY, type AnyPermissionRequirement } from './require-permission.decorator';

export interface PermissionContextUser {
  role?: string;
}

@Injectable()
export abstract class PermissionGuard implements CanActivate {
  constructor(protected readonly reflector: Reflector) {}

  protected abstract getContextUser(request: any): PermissionContextUser | undefined;
  protected abstract getGrantedPermissions(
    user: PermissionContextUser,
    requirement: AnyPermissionRequirement,
    request: any,
  ): string[];

  protected bypassForRole(_user: PermissionContextUser): boolean {
    return false;
  }

  canActivate(context: ExecutionContext): boolean {
    const requirement = this.reflector.getAllAndOverride<AnyPermissionRequirement>(
      ANY_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requirement?.anyOf?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = this.getContextUser(request);
    if (!user) {
      throw new ForbiddenException('Permission context is missing');
    }

    if (this.bypassForRole(user)) {
      return true;
    }

    const granted = new Set(this.getGrantedPermissions(user, requirement, request));
    const ok = requirement.anyOf.some((perm) => granted.has(perm));
    if (!ok) {
      throw new ForbiddenException(`Недостаточно прав для раздела ${requirement.scope}`);
    }

    return true;
  }
}
