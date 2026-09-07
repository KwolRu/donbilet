import { Injectable, BadRequestException } from '@nestjs/common';
import * as argon2 from 'argon2';

@Injectable()
export class PasswordService {
  private readonly PASSWORD_MIN_LENGTH = 8;

  /**
   * Валидирует пароль по требованиям безопасности
   */
  validatePassword(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!password) {
      errors.push('Пароль не может быть пустым');
      return { valid: false, errors };
    }

    if (password.length < this.PASSWORD_MIN_LENGTH) {
      errors.push(`Пароль должен быть минимум ${this.PASSWORD_MIN_LENGTH} символов`);
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Пароль должен содержать строчные буквы (a-z)');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Пароль должен содержать прописные буквы (A-Z)');
    }

    if (!/\d/.test(password)) {
      errors.push('Пароль должен содержать цифры (0-9)');
    }

    if (!/[!@#$%^&*_\-=+]/.test(password)) {
      errors.push('Пароль должен содержать спецсимволы (!@#$%^&*_-=+)');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Хеширует пароль с помощью Argon2
   */
  async hashPassword(password: string): Promise<string> {
    const validation = this.validatePassword(password);
    if (!validation.valid) {
      throw new BadRequestException({
        message: 'Пароль не соответствует требованиям безопасности',
        errors: validation.errors,
      });
    }

    try {
      return await argon2.hash(password, {
        type: argon2.argon2i,
        memoryCost: 2 ** 16,
        timeCost: 3,
        parallelism: 1,
      });
    } catch (error) {
      throw new Error(`Ошибка при хешировании пароля: ${error}`);
    }
  }

  /**
   * Проверяет пароль с его хешем
   */
  async comparePassword(password: string, hash: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch (error) {
      throw new Error(`Ошибка при проверке пароля: ${error}`);
    }
  }

}
