import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TokenService } from './token.service';

describe('TokenService', () => {
  let service: TokenService;

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
    decode: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: string) => {
      const config: Record<string, string> = {
        JWT_SECRET: 'test-secret-key',
        JWT_ACCESS_EXPIRATION: '1h',
        JWT_REFRESH_EXPIRATION: '30d',
        JWT_PASSWORD_RESET_EXPIRATION: '30m',
      };
      return config[key] || defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenService,
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<TokenService>(TokenService);

    jest.clearAllMocks();
  });

  const mockPayload = {
    id: 'user-id',
    phone: '+79001234567',
    role: 'student',
    workspaceId: 'workspace-id',
  };

  describe('generateTokenPair', () => {
    it('должен сгенерировать пару токенов', async () => {
      mockJwtService.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');

      const result = await service.generateTokenPair(mockPayload);

      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
      expect(mockJwtService.sign).toHaveBeenCalledTimes(2);
      const accessArg = mockJwtService.sign.mock.calls[0][0] as Record<string, unknown>;
      expect(accessArg.jti).toBeDefined();
      expect(accessArg.id).toBe(mockPayload.id);
      expect(mockJwtService.sign).toHaveBeenNthCalledWith(1, expect.any(Object), {
        expiresIn: '1h',
        secret: 'test-secret-key',
      });
      expect(mockJwtService.sign).toHaveBeenNthCalledWith(2, mockPayload, {
        expiresIn: '30d',
        secret: 'test-secret-key',
      });
    });
  });

  describe('generateAccessToken', () => {
    it('должен сгенерировать access token', () => {
      mockJwtService.sign.mockReturnValue('access-token');

      const result = service.generateAccessToken(mockPayload);

      expect(result).toBe('access-token');
      const arg = mockJwtService.sign.mock.calls[0][0] as Record<string, unknown>;
      expect(arg.jti).toBeDefined();
      expect(mockJwtService.sign).toHaveBeenCalledWith(expect.any(Object), {
        expiresIn: '1h',
        secret: 'test-secret-key',
      });
    });
  });

  describe('generateRefreshToken', () => {
    it('должен сгенерировать refresh token', () => {
      mockJwtService.sign.mockReturnValue('refresh-token');

      const result = service.generateRefreshToken(mockPayload);

      expect(result).toBe('refresh-token');
      expect(mockJwtService.sign).toHaveBeenCalledWith(mockPayload, {
        expiresIn: '30d',
        secret: 'test-secret-key',
      });
    });
  });

  describe('generatePasswordResetToken', () => {
    it('должен сгенерировать токен сброса пароля', () => {
      mockJwtService.sign.mockReturnValue('password-reset-token');

      const result = service.generatePasswordResetToken('user-id', 'workspace-id');

      expect(result).toBe('password-reset-token');
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        { userId: 'user-id', workspaceId: 'workspace-id', type: 'password-reset' },
        {
          expiresIn: '30m',
          secret: 'test-secret-key',
        },
      );
    });
  });

  describe('verifyToken', () => {
    it('должен верифицировать и вернуть payload', () => {
      mockJwtService.verify.mockReturnValue(mockPayload);

      const result = service.verifyToken('valid-token');

      expect(result).toEqual(mockPayload);
      expect(mockJwtService.verify).toHaveBeenCalledWith('valid-token', {
        secret: 'test-secret-key',
      });
    });

    it('должен бросить ошибку для невалидного токена', () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('invalid token');
      });

      expect(() => service.verifyToken('invalid-token')).toThrow();
    });
  });

  describe('decodeToken', () => {
    it('должен декодировать токен без проверки подписи', () => {
      mockJwtService.decode.mockReturnValue(mockPayload);

      const result = service.decodeToken('some-token');

      expect(result).toEqual(mockPayload);
      expect(mockJwtService.decode).toHaveBeenCalledWith('some-token');
    });
  });
});
