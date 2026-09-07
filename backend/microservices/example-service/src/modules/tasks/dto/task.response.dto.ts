import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TASK_STATUSES, type TaskStatusValue } from '../tasks.constants';

export class TaskResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  projectId!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty({ enum: TASK_STATUSES })
  status!: TaskStatusValue;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  dueAt!: Date | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;
}

export class TaskListResponseDto {
  @ApiProperty({ type: [TaskResponseDto] })
  items!: TaskResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;
}
