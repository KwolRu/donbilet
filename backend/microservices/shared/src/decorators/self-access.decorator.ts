import { SetMetadata } from '@nestjs/common';

export const SELF_ACCESS_KEY = 'selfAccess';

/**
 * Декоратор, разрешающий доступ к ресурсу без проверки CRM-прав,
 * если запрашиваемый ID (params.id) совпадает с ID текущего пользователя.
 * Используется для "самообслуживания" (личный профиль, редактирование себя).
 */
export const SelfAccess = () => SetMetadata(SELF_ACCESS_KEY, true);
