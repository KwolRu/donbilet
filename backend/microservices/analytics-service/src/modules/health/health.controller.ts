import { Controller, Get } from '@nestjs/common';
import { AnalyticsHealthService } from './health.service';

@Controller('health')
export class AnalyticsHealthController {
  constructor(private readonly healthService: AnalyticsHealthService) {}

  @Get()
  health() {
    return this.healthService.check();
  }
}
