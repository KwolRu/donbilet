import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshDto {
  @ApiProperty({
    example: 'eyJhbGc...',
    required: false,
    description: 'Refresh token (опционально, если не в cookie)',
  })
  @IsString({ message: 'Refresh token должен быть строкой' })
  @IsOptional()
  readonly refreshToken?: string;
}

export class RefreshResponseDto {
  @ApiProperty({ example: 'eyJhbGc...', description: 'Новый access token' })
  readonly accessToken!: string;

  @ApiProperty({ example: 'eyJhbGc...', description: 'Новый refresh token' })
  readonly refreshToken!: string;
}
