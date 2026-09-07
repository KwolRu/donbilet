import { BadRequestException, Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

@Injectable()
export class PasswordService {
  private readonly PASSWORD_MIN_LENGTH = 8;

  validatePassword(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!password) return { valid: false, errors: ['Пароль не может быть пустым'] };
    if (password.length < this.PASSWORD_MIN_LENGTH) {
      errors.push(`Пароль должен быть минимум ${this.PASSWORD_MIN_LENGTH} символов`);
    }
    if (!/[a-z]/.test(password)) errors.push('Пароль должен содержать строчные буквы (a-z)');
    if (!/[A-Z]/.test(password)) errors.push('Пароль должен содержать прописные буквы (A-Z)');
    if (!/\d/.test(password)) errors.push('Пароль должен содержать цифры (0-9)');
    return { valid: errors.length === 0, errors };
  }

  async hashPassword(password: string): Promise<string> {
    const validation = this.validatePassword(password);
    if (!validation.valid) {
      throw new BadRequestException({
        message: 'Пароль не соответствует требованиям безопасности',
        errors: validation.errors,
      });
    }
    return argon2.hash(password, {
      type: argon2.argon2i,
      memoryCost: 2 ** 16,
      timeCost: 3,
      parallelism: 1,
    });
  }

  async comparePassword(password: string, hash: string): Promise<boolean> {
    return argon2.verify(hash, password);
  }
}
