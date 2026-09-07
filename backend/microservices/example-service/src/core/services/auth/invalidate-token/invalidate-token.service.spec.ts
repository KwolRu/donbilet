import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { CacheService } from '../cache/cache.service';
import { InvalidateTokenService } from './invalidate-token.service';

describe('InvalidateTokenService', () => {
  let service: InvalidateTokenService;

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
  };

  const mockJwtService = {
    decode: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvalidateTokenService,
        { provide: CacheService, useValue: mockCacheService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<InvalidateTokenService>(InvalidateTokenService);

    jest.clearAllMocks();
  });

  describe('invalidateToken', () => {
    it('должен добавить токен в черный список с правильным TTL', async () => {
      const futureExp = Math.floor(Date.now() / 1000) + 900;
      mockJwtService.decode.mockReturnValue({ exp: futureExp });

      await service.invalidateToken('test-token');

      expect(mockCacheService.set).toHaveBeenCalledWith(
        'test-token',
        'invalid',
        expect.any(Number),
      );

      const ttlArg = mockCacheService.set.mock.calls[0][2];
      expect(ttlArg).toBeGreaterThan(0);
      expect(ttlArg).toBeLessThanOrEqual(900);
    });

    it('не должен кешировать если токен уже истек', async () => {
      const pastExp = Math.floor(Date.now() / 1000) - 100;
      mockJwtService.decode.mockReturnValue({ exp: pastExp });

      await service.invalidateToken('expired-token');

      expect(mockCacheService.set).not.toHaveBeenCalled();
    });

    it('не должен кешировать если токен не имеет exp', async () => {
      mockJwtService.decode.mockReturnValue({});

      await service.invalidateToken('no-exp-token');

      expect(mockCacheService.set).not.toHaveBeenCalled();
    });

    it('не должен кешировать если decode вернул null', async () => {
      mockJwtService.decode.mockReturnValue(null);

      await service.invalidateToken('bad-token');

      expect(mockCacheService.set).not.toHaveBeenCalled();
    });
  });

  describe('isTokenInvalidated', () => {
    it('должен вернуть true для инвалидированного токена', async () => {
      mockCacheService.get.mockResolvedValue('invalid');

      const result = await service.isTokenInvalidated('blacklisted-token');

      expect(result).toBe(true);
    });

    it('должен вернуть false для валидного токена', async () => {
      mockCacheService.get.mockResolvedValue(null);

      const result = await service.isTokenInvalidated('valid-token');

      expect(result).toBe(false);
    });

    it('должен вернуть false для undefined', async () => {
      mockCacheService.get.mockResolvedValue(undefined);

      const result = await service.isTokenInvalidated('unknown-token');

      expect(result).toBe(false);
    });
  });
});
