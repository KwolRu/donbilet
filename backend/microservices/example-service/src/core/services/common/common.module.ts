import { Module } from '@nestjs/common';
import { RateLimitService } from './rate-limit.service';
import { CachingModule } from '../auth/cache/cache.module';

@Module({
  imports: [CachingModule],
  providers: [RateLimitService],
  exports: [RateLimitService],
})
export class CommonModule {}
