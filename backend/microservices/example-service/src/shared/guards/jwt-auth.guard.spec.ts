import { UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  const mockTokenService = {
    verifyToken: jest.fn(),
  };

  const mockCacheService = {
    get: jest.fn(),
  };

  const createMockContext = (authHeader?: string) => {
    const request = {
      headers: {
        authorization: authHeader,
      },
      user: null,
    };

    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      request,
    };
  };

  beforeEach(() => {
    guard = new JwtAuthGuard(
      mockTokenService as any,
      mockCacheService as any,
    );

    jest.clearAllMocks();
  });

  it('должен пропустить запрос с валидным токеном', async () => {
    const context = createMockContext('Bearer valid-token');
    const payload = {
      id: 'user-id',
      phone: '+79001234567',
      role: 'USER',
      workspaceId: 'workspace-id',
      jti: 'jit-ok',
    };

    mockCacheService.get.mockImplementation((key: string) => {
      if (key === 'jti-blacklist:jit-ok') return Promise.resolve(null);
      return Promise.resolve(null);
    });
    mockTokenService.verifyToken.mockReturnValue(payload);

    const result = await guard.canActivate(context as any);

    expect(result).toBe(true);
    expect(context.request.user).toEqual(payload);
  });

  it('должен бросить UnauthorizedException без заголовка Authorization', async () => {
    const context = createMockContext(undefined);

    await expect(guard.canActivate(context as any)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('должен бросить UnauthorizedException для неверного формата', async () => {
    const context = createMockContext('InvalidFormat token');

    await expect(guard.canActivate(context as any)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('должен бросить UnauthorizedException для Bearer без токена', async () => {
    const context = createMockContext('Bearer ');

    mockCacheService.get.mockResolvedValue(null);
    mockTokenService.verifyToken.mockImplementation(() => {
      throw new Error('jwt malformed');
    });

    await expect(guard.canActivate(context as any)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('должен бросить UnauthorizedException для инвалидированного токена', async () => {
    const context = createMockContext('Bearer blacklisted-token');
    const payload = {
      id: 'user-id',
      phone: '+79001234567',
      role: 'student',
      workspaceId: 'workspace-id',
      jti: 'jit-revoked',
    };
    mockTokenService.verifyToken.mockReturnValue(payload);
    mockCacheService.get.mockImplementation((key: string) => {
      if (key === 'jti-blacklist:jit-revoked') return Promise.resolve(true);
      return Promise.resolve(null);
    });

    await expect(guard.canActivate(context as any)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('должен бросить UnauthorizedException для истекшего токена', async () => {
    const context = createMockContext('Bearer expired-token');
    mockCacheService.get.mockResolvedValue(null);
    mockTokenService.verifyToken.mockImplementation(() => {
      throw new Error('jwt expired');
    });

    await expect(guard.canActivate(context as any)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
