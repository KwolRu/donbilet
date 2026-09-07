/**
 * ШАБЛОН доменного контроллера. Копировать в
 * `microservices/<service>/src/modules/<feature>/<feature>.controller.ts`.
 *
 * В шаблоне уже есть то, что забывают чаще всего:
 *  - JwtAuthGuard + WorkspaceTransactionInterceptor (без второго RLS вернёт пусто);
 *  - workspaceId только из проверенного JWT, никогда из query/body;
 *  - ParseUUIDPipe на :id — мусорный id не должен доходить до БД;
 *  - 404 вместо 403 для чужой сущности;
 *  - idempotencyKey на необратимом действии;
 *  - 204 без тела на удалении.
 */

import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
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
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';

import { WorkspaceTransactionInterceptor } from '../../../../shared/src/prisma/workspace-transaction.interceptor';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import type { JwtPayload } from '../../shared/interfaces';

import { FeatureService } from './feature.service';
import { CreateFeatureDto } from './dto/create-feature.dto';
import { ListFeatureQueryDto } from './dto/list-feature-query.dto';

// Префикс повторяет публичный путь и ДОЛЖЕН быть добавлен:
//   1. в gateway/src/modules/proxy/proxy.routes.ts — { prefix: 'features', target: ... }
//   2. в WorkspaceContextMiddleware.forRoutes(...) внутри app.module.ts сервиса
@ApiTags('Features')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UseInterceptors(WorkspaceTransactionInterceptor)
@Controller('features')
export class FeatureController {
  constructor(private readonly feature: FeatureService) {}

  @Get()
  @ApiOperation({ summary: 'Список сущностей workspace' })
  list(@CurrentUser() user: JwtPayload, @Query() query: ListFeatureQueryDto) {
    // Тенант — ТОЛЬКО из проверенного токена. Не из query, не из body, не из заголовка.
    return this.feature.list(user.workspaceId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Одна сущность по id' })
  getById(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    // Сервис вернёт 404, если сущность принадлежит другому workspace:
    // 403 подтвердил бы её существование.
    return this.feature.getById(user.workspaceId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Создать сущность' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateFeatureDto) {
    return this.feature.create(user.workspaceId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновить сущность' })
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<CreateFeatureDto>,
  ) {
    return this.feature.update(user.workspaceId, id, dto);
  }

  @Post(':id/execute')
  @ApiOperation({ summary: 'Необратимое действие над сущностью' })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    description: 'Уникальный ключ операции: повтор запроса не повторяет эффект',
  })
  execute(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('idempotency-key') idempotencyKey: string,
  ) {
    return this.feature.execute(user.workspaceId, id, idempotencyKey);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить сущность' })
  remove(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.feature.remove(user.workspaceId, id);
  }
}
