/**
 * ШАБЛОН модуля.
 *
 * После создания сделать ТРИ вещи, иначе модуль либо не поднимется, либо
 * молча вернёт пустые данные:
 *
 *  1. Зарегистрировать в `microservices/<service>/src/app.module.ts` (imports).
 *  2. Добавить его маршрут в `WorkspaceContextMiddleware.forRoutes(...)` там же —
 *     без этого `req.workspace` пуст и интерцептор отдаст 401.
 *  3. Добавить префикс в `gateway/src/modules/proxy/proxy.routes.ts`
 *     плюс переменную окружения с URL сервиса.
 *
 * TokenModule и CachingModule нужны JwtAuthGuard: он верифицирует access-токен
 * и проверяет, не отозван ли он. PrismaModule подключён глобально.
 */

import { Module } from '@nestjs/common';

import { CachingModule } from '../../core/services/auth/cache/cache.module';
import { TokenModule } from '../../core/services/auth/token/token.module';
import { FeatureController } from './feature.controller';
import { FeatureService } from './feature.service';

@Module({
  imports: [TokenModule, CachingModule],
  controllers: [FeatureController],
  providers: [FeatureService],
  // exports: [FeatureService],  // только если сервис нужен другому модулю ЭТОГО сервиса
})
export class FeatureModule {}
