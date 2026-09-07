import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { toStringArrayQuery } from '../../../core/utils/query-array.util';
import { TASK_STATUSES, type TaskStatusValue } from '../tasks.constants';

export class ListTasksQueryDto {
  @ApiPropertyOptional({ format: 'uuid', description: 'Фильтр по проекту' })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({ description: 'Поиск по заголовку (ILIKE)' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: TASK_STATUSES, isArray: true })
  @IsOptional()
  @Transform(toStringArrayQuery)
  @IsEnum(TASK_STATUSES, { each: true })
  status?: TaskStatusValue[];

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
