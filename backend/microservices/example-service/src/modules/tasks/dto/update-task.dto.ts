import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateTaskDto } from './create-task.dto';

// projectId не меняется через update: перенос задачи между проектами — отдельная
// операция со своими правилами (и своим эндпоинтом), а не побочный эффект PATCH.
export class UpdateTaskDto extends PartialType(OmitType(CreateTaskDto, ['projectId'] as const)) {}
