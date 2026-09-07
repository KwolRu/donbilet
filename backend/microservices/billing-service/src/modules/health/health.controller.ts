import { Controller, Get } from '@nestjs/common';
import { BillingHealthService } from './health.service';

@Controller('health')
export class BillingHealthController {
  constructor(private readonly healthService: BillingHealthService) {}

  @Get()
  health() {
    return this.healthService.check();
  }
}
