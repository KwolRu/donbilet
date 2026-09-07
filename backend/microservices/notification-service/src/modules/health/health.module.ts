import { Module } from '@nestjs/common';
import { NotificationHealthController } from './health.controller';
import { NotificationHealthService } from './health.service';

@Module({
  controllers: [NotificationHealthController],
  providers: [NotificationHealthService],
})
export class NotificationHealthModule {}
