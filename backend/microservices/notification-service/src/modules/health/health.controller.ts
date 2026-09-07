import { Controller, Get } from '@nestjs/common';
import { NotificationHealthService } from './health.service';

@Controller('health')
export class NotificationHealthController {
  constructor(private readonly healthService: NotificationHealthService) {}

  @Get()
  health() {
    return this.healthService.check();
  }
}
