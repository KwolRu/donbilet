import { ConfigService } from '@nestjs/config';

export const isDev = (configService: ConfigService): boolean =>
  configService.get('NODE_ENV') !== 'production';
