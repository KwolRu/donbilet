import { EmailService } from './email.service';

describe('EmailService', () => {
  let service: EmailService;
  const mockQueue = {
    add: jest.fn(),
  };

  beforeEach(() => {
    service = new EmailService(mockQueue as any);
    jest.clearAllMocks();
  });

  it('enqueue verification email', async () => {
    await service.sendVerificationCode('user@example.com', '123456');
    expect(mockQueue.add).toHaveBeenCalledWith(
      'email-verification',
      expect.objectContaining({
        kind: 'email-verification',
        email: 'user@example.com',
        code: '123456',
      }),
    );
  });

  it('enqueue password reset email', async () => {
    await service.sendPasswordResetCode('user@example.com', '654321');
    expect(mockQueue.add).toHaveBeenCalledWith(
      'email-password-reset',
      expect.objectContaining({
        kind: 'email-password-reset',
        email: 'user@example.com',
        code: '654321',
      }),
    );
  });
});
