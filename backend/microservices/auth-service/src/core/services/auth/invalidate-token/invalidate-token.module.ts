import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { CachingModule } from '../cache/cache.module';
import { InvalidateTokenService } from './invalidate-token.service';

@Module({
  imports: [JwtModule, CachingModule],
  providers: [InvalidateTokenService],
  exports: [InvalidateTokenService],
})
export class InvalidateTokenModule {}
