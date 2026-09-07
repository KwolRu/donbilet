import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { PrismaModule } from '../../core/services/prisma/prisma.module';
import { PasswordModule } from '../../core/services/auth/password/password.module';
import { TokenModule } from '../../core/services/auth/token/token.module';
import { CachingModule } from '../../core/services/auth/cache/cache.module';
import { InvalidateTokenModule } from '../../core/services/auth/invalidate-token/invalidate-token.module';
import { CookieModule } from '../../core/services/auth/cookie/cookie.module';
import { CommonModule } from '../../core/services/common/common.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    PrismaModule,
    PasswordModule,
    TokenModule,
    CachingModule,
    InvalidateTokenModule,
    CookieModule,
    CommonModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
