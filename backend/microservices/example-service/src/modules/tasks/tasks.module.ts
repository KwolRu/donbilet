import { Module } from '@nestjs/common';
import { TokenModule } from '../../core/services/auth/token/token.module';
import { CachingModule } from '../../core/services/auth/cache/cache.module';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  imports: [TokenModule, CachingModule],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
