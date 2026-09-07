import { Injectable } from '@nestjs/common';

@Injectable()
export class BillingHealthService {
  check() {
    return {
      status: 'ok',
      service: 'billing-service',
      timestamp: new Date().toISOString(),
    };
  }
}
