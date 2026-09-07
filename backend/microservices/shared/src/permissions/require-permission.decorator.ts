import { SetMetadata } from '@nestjs/common';

export const ANY_PERMISSION_KEY = 'permission:any';

export type PermissionScope = 'crm' | 'courses' | 'billing' | string;
export type AnyPermissionRequirement = {
  scope: PermissionScope;
  anyOf: string[];
};

export const RequireAnyPermission = (
  scope: PermissionScope,
  ...permissions: string[]
) => SetMetadata(ANY_PERMISSION_KEY, { scope, anyOf: permissions } as AnyPermissionRequirement);
