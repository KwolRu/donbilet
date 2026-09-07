import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { HealthCheckService } from './health.service';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../../../../shared/src/decorators/public.decorator';

@ApiTags('Health')
@Public()
@Controller('health')
export class HealthCheckController {
  constructor(private healthCheckService: HealthCheckService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check application health status' })
  @ApiResponse({
    status: 200,
    description: 'Application is healthy',
    schema: {
      example: {
        status: 'healthy',
        timestamp: '2026-03-24T18:30:00.000Z',
        services: {
          database: { status: 'up', message: 'Database is connected' },
          redis: { status: 'up', message: 'Redis is connected' },
        },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Application is unhealthy',
  })
  async getHealth() {
    return this.healthCheckService.checkAll();
  }
}
