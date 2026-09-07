import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';

export function RegistrationSwagger() { return applyDecorators(ApiOperation({ summary: 'Регистрация нового пользователя' }), ApiResponse({ status: 201 })); }
export function LoginSwagger() { return applyDecorators(ApiOperation({ summary: 'Вход в систему' }), ApiResponse({ status: 200 })); }
export function VerifyEmailSwagger() { return applyDecorators(ApiOperation({ summary: 'Подтверждение телефона по OTP коду' }), ApiResponse({ status: 200 })); }
export function ResendVerificationSwagger() { return applyDecorators(ApiOperation({ summary: 'Повторная отправка кода подтверждения' }), ApiBody({ schema: { example: { phone: '+79991234567' } } })); }
export function RefreshSwagger() { return applyDecorators(ApiOperation({ summary: 'Обновление access token по refresh token' }), ApiResponse({ status: 200 })); }
export function LogoutSwagger() { return applyDecorators(ApiBearerAuth(), ApiOperation({ summary: 'Выход из системы' }), ApiResponse({ status: 200 })); }
export function LogoutAllSwagger() { return applyDecorators(ApiBearerAuth(), ApiOperation({ summary: 'Выход со всех устройств' }), ApiResponse({ status: 200 })); }
export function ForgotPasswordSwagger() { return applyDecorators(ApiOperation({ summary: 'Запрос восстановления пароля' }), ApiResponse({ status: 200 })); }
export function ResetPasswordSwagger() { return applyDecorators(ApiOperation({ summary: 'Восстановление пароля по OTP коду' }), ApiResponse({ status: 200 })); }
