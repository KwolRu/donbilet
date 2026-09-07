import { Injectable } from '@nestjs/common';

@Injectable()
export class AnalyticsHealthService {
  check() {
    return {
      status: 'ok',
      service: 'analytics-service',
      timestamp: new Date().toISOString(),
    };
  }
}
