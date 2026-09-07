import { Test, TestingModule } from '@nestjs/testing';
import { CacheService, REDIS_CLIENT } from './cache.service';

describe('CacheService', () => {
  let service: CacheService;

  const mockRedis = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    ttl: jest.fn(),
    scan: jest.fn(),
    quit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        { provide: REDIS_CLIENT, useValue: mockRedis },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);

    jest.clearAllMocks();
  });

  describe('get', () => {
    it('должен распарсить JSON и вернуть значение', async () => {
      mockRedis.get.mockResolvedValue('"cached-value"');

      const result = await service.get<string>('my-key');

      expect(result).toBe('cached-value');
      expect(mockRedis.get).toHaveBeenCalledWith('my-key');
    });

    it('должен вернуть undefined если ключ не найден', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await service.get('nonexistent');

      expect(result).toBeUndefined();
    });
  });

  describe('set', () => {
    it('должен сохранить значение с TTL в секундах', async () => {
      await service.set('key', 'value', 60);

      expect(mockRedis.set).toHaveBeenCalledWith('key', '"value"', 'EX', 60);
    });

    it('должен сохранить значение без TTL', async () => {
      await service.set('key', 'value');

      expect(mockRedis.set).toHaveBeenCalledWith('key', '"value"');
    });
  });

  describe('del', () => {
    it('должен удалить ключ', async () => {
      await service.del('key');

      expect(mockRedis.del).toHaveBeenCalledWith('key');
    });
  });

  describe('ttl', () => {
    it('должен вернуть 0 если значение существует', async () => {
      mockRedis.get.mockResolvedValue('"some-value"');

      const result = await service.ttl('key');

      expect(result).toBe(0);
    });

    it('должен вернуть -1 если значение не существует', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await service.ttl('key');

      expect(result).toBe(-1);
    });
  });

  describe('getTtl', () => {
    it('должен вернуть оставшийся TTL в секундах', async () => {
      mockRedis.ttl.mockResolvedValue(120);

      const result = await service.getTtl('key');

      expect(result).toBe(120);
    });

    it('должен вернуть 0 для ключа без TTL', async () => {
      mockRedis.ttl.mockResolvedValue(-1);

      const result = await service.getTtl('key');

      expect(result).toBe(0);
    });
  });

  describe('deleteByPrefix', () => {
    it('должен пройти по scan и удалить найденные ключи', async () => {
      mockRedis.scan
        .mockResolvedValueOnce(['7', ['refresh:a', 'refresh:b']])
        .mockResolvedValueOnce(['0', ['refresh:c']]);
      mockRedis.del.mockResolvedValueOnce(2).mockResolvedValueOnce(1);

      const deleted = await service.deleteByPrefix('refresh:');

      expect(deleted).toBe(3);
      expect(mockRedis.scan).toHaveBeenCalledTimes(2);
    });
  });
});
