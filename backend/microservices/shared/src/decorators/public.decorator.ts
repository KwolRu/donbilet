import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route or controller as public (no auth required).
 * Must be checked by global guards via Reflector.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
