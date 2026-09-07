import { Module } from '@nestjs/common';
import { TokenModule } from '../../core/services/auth/token/token.module';
import { CachingModule } from '../../core/services/auth/cache/cache.module';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

// TokenModule + CachingModule нужны JwtAuthGuard (верификация access-токена и
// проверка отзыва). PrismaModule подключён глобально в app.module.
@Module({
  imports: [TokenModule, CachingModule],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
