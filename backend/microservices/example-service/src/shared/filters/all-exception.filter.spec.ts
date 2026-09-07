import { HttpException, HttpStatus } from '@nestjs/common';
import { AllExceptionFilter } from './all-exception.filter';

describe('AllExceptionFilter rate-limit contract', () => {
  it('preserves the public error code and sets Retry-After', () => {
    const setHeader = jest.fn();
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status, setHeader }),
        getRequest: () => ({ url: '/api/crm/leads/lead-1/communications' }),
      }),
    };
    const exception = new HttpException(
      {
        code: 'COMMENTS_RATE_LIMIT_EXCEEDED',
        message: 'Можно отправить не более 10 комментариев в минуту',
        retryAfterSeconds: 13,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );

    new AllExceptionFilter().catch(exception, host as never);

    expect(setHeader).toHaveBeenCalledWith('Retry-After', '13');
    expect(status).toHaveBeenCalledWith(HttpStatus.TOO_MANY_REQUESTS);
    expect(json).toHaveBeenCalledWith({
      status: HttpStatus.TOO_MANY_REQUESTS,
      message: ['Можно отправить не более 10 комментариев в минуту'],
      error: true,
      code: 'COMMENTS_RATE_LIMIT_EXCEEDED',
      retryAfterSeconds: 13,
    });
  });
});
