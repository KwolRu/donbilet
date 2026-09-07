import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { SmsModule } from './core/services/sms/sms.module';
import { EmailModule } from './core/services/email/email.module';
import { NotificationProcessor } from './notification.processor';
import { NotificationHealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      expandVariables: true,
    }),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT || 6379),
        password: process.env.REDIS_PASSWORD || undefined,
      },
    }),
    BullModule.registerQueue({
      name:
        process.env.BULLMQ_NOTIFICATIONS_QUEUE ||
        'global_notification_dispatch',
    }),
    SmsModule,
    EmailModule,
    NotificationHealthModule,
  ],
  providers: [NotificationProcessor],
})
export class NotificationAppModule {}
