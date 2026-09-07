import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsISO8601, IsOptional, IsString, IsUUID, Length } from 'class-validator';
import { TASK_STATUSES, type TaskStatusValue } from '../tasks.constants';

export class CreateTaskDto {
  @ApiProperty({ format: 'uuid', description: 'Проект должен принадлежать тому же workspace' })
  @IsUUID()
  projectId!: string;

  @ApiProperty({ example: 'Настроить CI', minLength: 1, maxLength: 300 })
  @IsString()
  @Length(1, 300)
  title!: string;

  @ApiPropertyOptional({ enum: TASK_STATUSES, default: TASK_STATUSES[0] })
  @IsOptional()
  @IsEnum(TASK_STATUSES)
  status?: TaskStatusValue;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  @IsOptional()
  @IsISO8601()
  dueAt?: string | null;
}
