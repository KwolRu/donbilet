import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { WorkspaceTransactionInterceptor } from '../../../../shared/src/prisma/workspace-transaction.interceptor';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import type { JwtPayload } from '../../shared/interfaces';
import {
  CreateTaskDto,
  ListTasksQueryDto,
  TaskListResponseDto,
  TaskResponseDto,
  UpdateTaskDto,
} from './dto';
import { TasksService } from './tasks.service';

@ApiTags('Tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UseInterceptors(WorkspaceTransactionInterceptor)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @ApiOperation({ summary: 'Список задач workspace (опционально — внутри проекта)' })
  @ApiResponse({ status: 200, type: TaskListResponseDto })
  list(@CurrentUser() user: JwtPayload, @Query() query: ListTasksQueryDto) {
    return this.tasksService.list(user.workspaceId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Задача по id' })
  @ApiResponse({ status: 200, type: TaskResponseDto })
  getById(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.tasksService.getById(user.workspaceId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Создать задачу в проекте' })
  @ApiResponse({ status: 201, type: TaskResponseDto })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateTaskDto) {
    return this.tasksService.create(user.workspaceId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновить задачу' })
  @ApiResponse({ status: 200, type: TaskResponseDto })
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasksService.update(user.workspaceId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить задачу' })
  @ApiResponse({ status: 204, description: 'Задача удалена' })
  remove(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.tasksService.remove(user.workspaceId, id);
  }
}
