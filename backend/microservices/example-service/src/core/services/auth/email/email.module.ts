import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { EmailService } from './email.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name:
        process.env.BULLMQ_NOTIFICATIONS_QUEUE ||
        'global_notification_dispatch',
    }),
  ],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
