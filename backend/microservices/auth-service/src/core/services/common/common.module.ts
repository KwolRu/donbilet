import { Module } from '@nestjs/common';
import { CachingModule } from '../auth/cache/cache.module';
import { RateLimitService } from './rate-limit.service';

@Module({
  imports: [CachingModule],
  providers: [RateLimitService],
  exports: [RateLimitService],
})
export class CommonModule {}
