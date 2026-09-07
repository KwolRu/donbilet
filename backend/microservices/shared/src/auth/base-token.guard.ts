import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export abstract class BaseTokenGuard<TPayload> implements CanActivate {
  protected abstract getToken(request: any): string | undefined;
  protected abstract verifyToken(token: string): TPayload;
  protected abstract isRevoked(token: string, payload: TPayload): Promise<boolean>;
  protected abstract attachPayload(request: any, payload: TPayload): void;
  protected validatePayload(_payload: TPayload): void {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.getToken(request);
    if (!token) {
      throw new UnauthorizedException('Authorization token missing');
    }

    try {
      const payload = this.verifyToken(token);
      if (await this.isRevoked(token, payload)) {
        throw new UnauthorizedException('Token has been revoked');
      }
      this.validatePayload(payload);
      this.attachPayload(request, payload);
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
