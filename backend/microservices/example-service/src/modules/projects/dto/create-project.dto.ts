import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { PROJECT_STATUSES, type ProjectStatusValue } from '../projects.constants';

export class CreateProjectDto {
  @ApiProperty({ example: 'Внутренний портал', minLength: 1, maxLength: 200 })
  @IsString()
  @Length(1, 200)
  name!: string;

  @ApiPropertyOptional({ example: 'Короткое описание проекта', maxLength: 2000 })
  @IsOptional()
  @IsString()
  @Length(0, 2000)
  description?: string;

  @ApiPropertyOptional({ enum: PROJECT_STATUSES, default: PROJECT_STATUSES[0] })
  @IsOptional()
  @IsEnum(PROJECT_STATUSES)
  status?: ProjectStatusValue;
}
