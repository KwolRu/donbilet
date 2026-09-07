import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PROJECT_STATUSES, type ProjectStatusValue } from '../projects.constants';

export class ProjectResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiProperty({ enum: PROJECT_STATUSES })
  status!: ProjectStatusValue;

  @ApiProperty({ description: 'Количество задач в проекте' })
  tasksCount!: number;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;
}

export class ProjectListResponseDto {
  @ApiProperty({ type: [ProjectResponseDto] })
  items!: ProjectResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;
}
