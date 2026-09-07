import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RateLimitService } from './rate-limit.service';
import { CacheService } from '../auth/cache/cache.service';

describe('RateLimitService', () => {
  let service: RateLimitService;

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimitService,
        { provide: CacheService, useValue: mockCacheService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<RateLimitService>(RateLimitService);

    jest.clearAllMocks();
  });

  describe('checkLoginLimit', () => {
    it('должен пропустить если попыток меньше лимита', async () => {
      mockCacheService.get.mockResolvedValue(3);

      await expect(service.checkLoginLimit('127.0.0.1')).resolves.not.toThrow();
    });

    it('должен пропустить если попыток нет', async () => {
      mockCacheService.get.mockResolvedValue(null);

      await expect(service.checkLoginLimit('127.0.0.1')).resolves.not.toThrow();
    });

    it('должен бросить 429 если лимит превышен', async () => {
      mockCacheService.get.mockResolvedValue(5);

      await expect(service.checkLoginLimit('127.0.0.1')).rejects.toThrow(
        HttpException,
      );

      try {
        await service.checkLoginLimit('127.0.0.1');
      } catch (error) {
        expect((error as HttpException).getStatus()).toBe(
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    });

    it('должен бросить 429 если попыток больше лимита', async () => {
      mockCacheService.get.mockResolvedValue(10);

      await expect(service.checkLoginLimit('127.0.0.1')).rejects.toThrow(
        HttpException,
      );
    });
  });

  describe('checkRegisterLimit', () => {
    it('должен пропустить если попыток меньше лимита', async () => {
      mockCacheService.get.mockResolvedValue(2);

      await expect(
        service.checkRegisterLimit('test@test.com'),
      ).resolves.not.toThrow();
    });

    it('должен бросить 429 если лимит превышен (3 попытки)', async () => {
      mockCacheService.get.mockResolvedValue(3);

      await expect(
        service.checkRegisterLimit('test@test.com'),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('checkResendVerificationLimit', () => {
    it('должен пропустить если попыток меньше лимита', async () => {
      mockCacheService.get.mockResolvedValue(1);

      await expect(
        service.checkResendVerificationLimit('test@test.com'),
      ).resolves.not.toThrow();
    });

    it('должен бросить 429 если лимит превышен (3 попытки)', async () => {
      mockCacheService.get.mockResolvedValue(3);

      await expect(
        service.checkResendVerificationLimit('test@test.com'),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('incrementLoginAttempts', () => {
    it('должен увеличить счетчик с 0', async () => {
      mockCacheService.get.mockResolvedValue(null);

      await service.incrementLoginAttempts('127.0.0.1');

      expect(mockCacheService.set).toHaveBeenCalledWith(
        'rate-limit:login:127.0.0.1',
        1,
        expect.any(Number),
      );
    });

    it('должен увеличить существующий счетчик', async () => {
      mockCacheService.get.mockResolvedValue(3);

      await service.incrementLoginAttempts('127.0.0.1');

      expect(mockCacheService.set).toHaveBeenCalledWith(
        'rate-limit:login:127.0.0.1',
        4,
        expect.any(Number),
      );
    });
  });

  describe('clearLoginAttempts', () => {
    it('должен удалить ключ из кеша', async () => {
      await service.clearLoginAttempts('127.0.0.1');

      expect(mockCacheService.del).toHaveBeenCalledWith(
        'rate-limit:login:127.0.0.1',
      );
    });
  });
});
