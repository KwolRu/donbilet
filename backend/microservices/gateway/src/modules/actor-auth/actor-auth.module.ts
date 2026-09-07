import { Module } from '@nestjs/common';
import { ActorAuthMiddleware } from './actor-auth.middleware';

// Тенант и роль берутся из JWT, без обращения к auth-service по gRPC:
// лишний сетевой хоп на каждый запрос не нужен, пока роль умещается в токен.
@Module({
  providers: [ActorAuthMiddleware],
  exports: [ActorAuthMiddleware],
})
export class ActorAuthModule {}
