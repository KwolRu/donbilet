import { type MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';

import { PrismaModule } from './core/services/prisma/prisma.module';
import { HealthCheckModule } from './modules/health/health.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { LoggingMiddleware } from './shared/middlewares/logger.middleware';
import { WorkspaceContextMiddleware } from '../../shared/src/middleware/workspace-context.middleware';

/**
 * Эталонный доменный сервис.
 *
 * При добавлении модуля, который работает с tenant-данными, его маршрут
 * ОБЯЗАТЕЛЬНО добавляется в `WorkspaceContextMiddleware.forRoutes(...)` ниже —
 * иначе `req.workspace` не будет заполнен. Это единственное место, где
 * фиксируется список tenant-маршрутов сервиса.
 */
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
    PrismaModule,
    HealthCheckModule,
    ProjectsModule,
    TasksModule,
  ],
})
export class ExampleAppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggingMiddleware).forRoutes('*');
    consumer.apply(WorkspaceContextMiddleware).forRoutes('projects', 'tasks');
  }
}
