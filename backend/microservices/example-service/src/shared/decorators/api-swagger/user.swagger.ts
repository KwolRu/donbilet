import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';

export function GetProfileSwagger() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Получить профиль текущего пользователя' }),
    ApiResponse({
      status: 200,
      description: 'Профиль получен',
      schema: {
        example: {
          success: true,
          data: {
            id: 'uuid',
            email: 'user@example.com',
            name: 'John Doe',
            role: 'USER',
            isEmailVerified: true,
            isActive: true,
            createdAt: '2026-03-24T12:00:00Z',
            lastLoginAt: '2026-03-24T13:45:00Z',
          },
        },
      },
    }),
  );
}

export function UpdateProfileSwagger() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Обновить профиль пользователя' }),
    ApiBody({
      description: 'Данные для обновления профиля',
      schema: {
        example: { name: 'Jane Doe', phoneNumber: '+79991234567' },
      },
    }),
    ApiResponse({
      status: 200,
      description: 'Профиль обновлен',
    }),
  );
}

export function ChangePasswordSwagger() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Изменить пароль авторизованного пользователя' }),
    ApiBody({
      description: 'Текущий и новый пароль',
      schema: {
        example: { currentPassword: 'OldPass123!', newPassword: 'NewPass456!' },
      },
    }),
    ApiResponse({ status: 200, description: 'Пароль успешно изменён' }),
    ApiResponse({ status: 400, description: 'Неверный текущий пароль' }),
  );
}

export function GetAllUsersSwagger() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Получить список всех пользователей (admin only)' }),
    ApiResponse({
      status: 200,
      description: 'Список пользователей',
    }),
    ApiResponse({ status: 403, description: 'Недостаточно прав' }),
  );
}

export function UpdateUserRoleSwagger() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Обновить роль пользователя (admin only)' }),
    ApiBody({
      description: 'Новая роль',
      schema: { example: { role: 'MANAGER' } },
    }),
    ApiResponse({ status: 200, description: 'Роль обновлена' }),
    ApiResponse({ status: 403, description: 'Недостаточно прав' }),
  );
}
