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
  CreateProjectDto,
  ListProjectsQueryDto,
  ProjectListResponseDto,
  ProjectResponseDto,
  UpdateProjectDto,
} from './dto';
import { ProjectsService } from './projects.service';

/**
 * Эталон доменного контроллера шаблона.
 *
 * Контроллер только: валидирует вход (DTO + глобальный ValidationPipe), достаёт
 * `workspaceId` из проверенного JWT и отдаёт результат сервиса. Бизнес-логики и
 * обращений к Prisma здесь нет. Формат ошибок — глобальный AllExceptionFilter.
 *
 * `WorkspaceTransactionInterceptor` обязателен на каждом tenant-контроллере:
 * без него запросы уйдут вне workspace-транзакции и RLS вернёт ноль строк.
 */
@ApiTags('Projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UseInterceptors(WorkspaceTransactionInterceptor)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @ApiOperation({ summary: 'Список проектов workspace с фильтрами и пагинацией' })
  @ApiResponse({ status: 200, type: ProjectListResponseDto })
  list(@CurrentUser() user: JwtPayload, @Query() query: ListProjectsQueryDto) {
    return this.projectsService.list(user.workspaceId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Проект по id' })
  @ApiResponse({ status: 200, type: ProjectResponseDto })
  getById(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.projectsService.getById(user.workspaceId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Создать проект' })
  @ApiResponse({ status: 201, type: ProjectResponseDto })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateProjectDto) {
    return this.projectsService.create(user.workspaceId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновить проект' })
  @ApiResponse({ status: 200, type: ProjectResponseDto })
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projectsService.update(user.workspaceId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить проект вместе с его задачами' })
  @ApiResponse({ status: 204, description: 'Проект удалён' })
  remove(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.projectsService.remove(user.workspaceId, id);
  }
}
