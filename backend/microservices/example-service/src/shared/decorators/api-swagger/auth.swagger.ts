import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';

export function RegistrationSwagger() {
  return applyDecorators(
    ApiOperation({ summary: 'Регистрация нового пользователя' }),
    ApiBody({
      description: 'Данные для регистрации',
      schema: {
        example: {
          phone: '+79991234567',
          password: 'Password123!',
          name: 'John Doe',
        },
      },
    }),
    ApiResponse({
      status: 201,
      description: 'Пользователь успешно зарегистрирован',
      schema: {
        example: {
          success: true,
          message: 'Код подтверждения отправлен на телефон',
          data: {
            id: 'uuid',
            phone: '+79991234567',
            name: 'John Doe',
            status: 'pending',
            role: 'student',
          },
        },
      },
    }),
    ApiResponse({ status: 400, description: 'Ошибка валидации' }),
    ApiResponse({ status: 409, description: 'Телефон уже зарегистрирован' }),
  );
}

export function LoginSwagger() {
  return applyDecorators(
    ApiOperation({ summary: 'Вход в систему' }),
    ApiBody({
      description: 'Учетные данные для входа',
      schema: {
        example: {
          phone: '+79991234567',
          password: 'Password123!',
        },
      },
    }),
    ApiResponse({
      status: 200,
      description: 'Успешный вход',
      schema: {
        example: {
          success: true,
          data: {
            user: {
              id: 'uuid',
              phone: '+79991234567',
              name: 'John Doe',
              role: 'student',
              status: 'active',
            },
            accessToken: 'eyJhbGc...',
            refreshToken: 'eyJhbGc...',
          },
        },
      },
    }),
    ApiResponse({ status: 404, description: 'Неверный телефон или пароль' }),
    ApiResponse({ status: 429, description: 'Слишком много попыток входа' }),
  );
}

export function VerifyEmailSwagger() {
  return applyDecorators(
    ApiOperation({ summary: 'Подтверждение телефона по OTP коду' }),
    ApiResponse({
      status: 200,
      description: 'Телефон подтверждён',
      schema: {
        example: {
          success: true,
          message: 'Телефон подтверждён',
        },
      },
    }),
    ApiResponse({ status: 400, description: 'Неверный или истёкший код' }),
  );
}

export function ResendVerificationSwagger() {
  return applyDecorators(
    ApiOperation({ summary: 'Повторная отправка кода подтверждения' }),
    ApiBody({
      description: 'Телефон для повторной отправки',
      schema: { example: { phone: '+79991234567' } },
    }),
    ApiResponse({
      status: 200,
      description: 'Код отправлен повторно',
      schema: {
        example: {
          success: true,
          message: 'Код подтверждения отправлен на +79991234567',
        },
      },
    }),
  );
}

export function RefreshSwagger() {
  return applyDecorators(
    ApiOperation({ summary: 'Обновление access token по refresh token' }),
    ApiResponse({
      status: 200,
      description: 'Токены обновлены',
      schema: {
        example: {
          success: true,
          data: {
            accessToken: 'eyJhbGc...',
            refreshToken: 'eyJhbGc...',
          },
        },
      },
    }),
    ApiResponse({ status: 401, description: 'Невалидный refresh token' }),
  );
}

export function LogoutSwagger() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Выход из системы' }),
    ApiResponse({
      status: 200,
      description: 'Успешный выход',
      schema: {
        example: {
          success: true,
          message: 'Успешно вышли из системы',
        },
      },
    }),
  );
}

export function LogoutAllSwagger() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Выход со всех устройств' }),
    ApiResponse({
      status: 200,
      description: 'Вышли со всех устройств',
      schema: {
        example: {
          success: true,
          message: 'Вышли со всех устройств',
        },
      },
    }),
  );
}

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
            phone: '+79991234567',
            name: 'John Doe',
            role: 'student',
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
        example: { name: 'Jane Doe' },
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

export function ForgotPasswordSwagger() {
  return applyDecorators(
    ApiOperation({ summary: 'Запрос восстановления пароля' }),
    ApiBody({
      description: 'Телефон для восстановления',
      schema: { example: { phone: '+79991234567' } },
    }),
    ApiResponse({
      status: 200,
      description: 'Код восстановления отправлен',
    }),
  );
}

export function ResetPasswordSwagger() {
  return applyDecorators(
    ApiOperation({ summary: 'Восстановление пароля по OTP коду' }),
    ApiBody({
      description: 'Телефон, код и новый пароль',
      schema: {
        example: { phone: '+79991234567', code: '123456', newPassword: 'NewPass456!' },
      },
    }),
    ApiResponse({ status: 200, description: 'Пароль успешно сброшен' }),
    ApiResponse({ status: 400, description: 'Неверный или истёкший код' }),
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
