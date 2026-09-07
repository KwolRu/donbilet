import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PasswordService } from './password.service';
import * as argon2 from 'argon2';

describe('PasswordService', () => {
  let service: PasswordService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PasswordService],
    }).compile();

    service = module.get<PasswordService>(PasswordService);

    jest.clearAllMocks();
  });

  describe('validatePassword', () => {
    it('должен вернуть valid: true для корректного пароля', () => {
      const result = service.validatePassword('Test123!@');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('должен вернуть ошибку для пустого пароля', () => {
      const result = service.validatePassword('');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Пароль не может быть пустым');
    });

    it('должен вернуть ошибку для null/undefined', () => {
      const result = service.validatePassword(null as any);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Пароль не может быть пустым');
    });

    it('должен вернуть ошибку если пароль короче 8 символов', () => {
      const result = service.validatePassword('Te1!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Пароль должен быть минимум 8 символов');
    });

    it('должен вернуть ошибку если нет строчных букв', () => {
      const result = service.validatePassword('TEST1234!@');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Пароль должен содержать строчные буквы (a-z)');
    });

    it('должен вернуть ошибку если нет прописных букв', () => {
      const result = service.validatePassword('test1234!@');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Пароль должен содержать прописные буквы (A-Z)');
    });

    it('должен вернуть ошибку если нет цифр', () => {
      const result = service.validatePassword('TestTest!@');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Пароль должен содержать цифры (0-9)');
    });

    it('должен вернуть ошибку если нет спецсимволов', () => {
      const result = service.validatePassword('TestTest12');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Пароль должен содержать спецсимволы (!@#$%^&*_-=+)');
    });

    it('должен вернуть несколько ошибок для совсем слабого пароля', () => {
      const result = service.validatePassword('abc');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe('hashPassword', () => {
    it('должен хешировать корректный пароль', async () => {
      const password = 'Test123!@';
      const hash = await service.hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.startsWith('$argon2')).toBe(true);
    });

    it('должен бросить BadRequestException для невалидного пароля', async () => {
      await expect(service.hashPassword('weak')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('comparePassword', () => {
    it('должен вернуть true для корректного пароля', async () => {
      const password = 'Test123!@';
      const hash = await argon2.hash(password, {
        type: argon2.argon2i,
        memoryCost: 2 ** 16,
        timeCost: 3,
        parallelism: 1,
      });

      const result = await service.comparePassword(password, hash);
      expect(result).toBe(true);
    });

    it('должен вернуть false для неверного пароля', async () => {
      const hash = await argon2.hash('Test123!@', {
        type: argon2.argon2i,
        memoryCost: 2 ** 16,
        timeCost: 3,
        parallelism: 1,
      });

      const result = await service.comparePassword('WrongPassword1!', hash);
      expect(result).toBe(false);
    });
  });
});
