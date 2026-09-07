import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { LoggerMiddleware } from './middleware/logger.middleware';
import { OriginCheckMiddleware } from './middleware/origin-check.middleware';
import { ActorAuthModule } from './modules/actor-auth/actor-auth.module';
import { ActorAuthMiddleware } from './modules/actor-auth/actor-auth.middleware';
import { ProxyModule } from './modules/proxy/proxy.module';

/**
 * Gateway — единственная точка входа для фронта.
 *
 * Здесь НЕТ бизнес-логики и обращений к БД: только CORS/origin-check,
 * верификация JWT (ActorAuth) и проксирование в доменные сервисы по карте
 * `modules/proxy/proxy.routes.ts`. См. ADR-0001 §5.
 */
@Module({
  imports: [ActorAuthModule, ProxyModule],
})
export class GatewayAppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(OriginCheckMiddleware).forRoutes('*');
    consumer.apply(LoggerMiddleware).forRoutes('*');
    consumer.apply(ActorAuthMiddleware).forRoutes('*');
  }
}
