import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { toStringArrayQuery } from '../../../core/utils/query-array.util';
import { PROJECT_STATUSES, type ProjectStatusValue } from '../projects.constants';

export class ListProjectsQueryDto {
  @ApiPropertyOptional({ description: 'Поиск по названию (ILIKE)' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: PROJECT_STATUSES,
    isArray: true,
    description: 'Поддерживает ?status=a,b и ?status=a&status=b',
  })
  @IsOptional()
  @Transform(toStringArrayQuery)
  @IsEnum(PROJECT_STATUSES, { each: true })
  status?: ProjectStatusValue[];

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
