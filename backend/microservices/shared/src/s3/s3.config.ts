import { ConfigService } from '@nestjs/config';

export type S3Config = {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
};

export function getS3Config(configService: ConfigService): S3Config {
  return {
    endpoint: configService.getOrThrow<string>('S3_ENDPOINT'),
    region: configService.getOrThrow<string>('S3_REGION'),
    accessKeyId: configService.getOrThrow<string>('S3_ACCESS_KEY'),
    secretAccessKey: configService.getOrThrow<string>('S3_SECRET_KEY'),
    bucketName: configService.getOrThrow<string>('S3_BUCKET_NAME'),
  };
}
