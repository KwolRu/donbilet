import { Injectable } from '@nestjs/common';

@Injectable()
export class NotificationHealthService {
  check() {
    return {
      status: 'ok',
      service: 'notification-service',
      timestamp: new Date().toISOString(),
    };
  }
}
