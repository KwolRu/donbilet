/**
 * ШАБЛОН доменного сервиса. Копировать в
 * `microservices/<service>/src/modules/<feature>/<feature>.service.ts`
 * и заменить Feature на своё имя.
 *
 * ИНВАРИАНТЫ, зашитые в шаблон:
 *  - запросы идут через `prisma.db` — транзакцию с workspace-контекстом,
 *    иначе RLS вернёт ноль строк (ADR-0002 §3);
 *  - каждый запрос к БД несёт workspaceId в where;
 *  - чужая сущность = 404, а не 403: 403 подтверждает существование чужого id;
 *  - update/delete — через updateMany/deleteMany, проверка владения внутри запроса;
 *  - id из тела запроса проверяются на принадлежность workspace до записи;
 *  - статусы — константы, не литералы;
 *  - у списка всегда есть потолок страницы.
 */

import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../core/services/prisma/prisma.service';
import { CreateFeatureDto } from './dto/create-feature.dto';
import { ListFeatureQueryDto } from './dto/list-feature-query.dto';

// Дублирует enum из Prisma-схемы намеренно: DTO и Swagger не должны
// зависеть от сгенерированного клиента.
export const FEATURE_STATUSES = ['draft', 'active', 'archived'] as const;
export type FeatureStatus = (typeof FEATURE_STATUSES)[number];

const MAX_PAGE_SIZE = 100;

@Injectable()
export class FeatureService {
  private readonly logger = new Logger(FeatureService.name);

  constructor(private readonly prisma: PrismaService) {}

  async list(workspaceId: string, query: ListFeatureQueryDto) {
    const limit = Math.min(query.limit ?? 20, MAX_PAGE_SIZE);
    const page = query.page ?? 1;

    const where: Prisma.FeatureWhereInput = {
      workspaceId, // ← ВСЕГДА, даже если «сервис же тенантный»
      ...(query.status?.length ? { status: { in: query.status } } : {}),
      ...(query.search
        ? { name: { contains: query.search, mode: 'insensitive' as const } }
        : {}),
    };

    // Уже внутри workspace-транзакции — вложенный $transaction невозможен
    // и не нужен: снимок данных согласован.
    const [items, total] = await Promise.all([
      this.prisma.db.feature.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.db.feature.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async getById(workspaceId: string, id: string) {
    // findFirst с tenant-фильтром, а НЕ findUnique по id: findUnique вернёт
    // чужую строку, и её придётся отфильтровывать вручную — однажды забудут.
    const row = await this.prisma.db.feature.findFirst({ where: { id, workspaceId } });
    if (!row) throw new NotFoundException('Сущность не найдена');
    return row;
  }

  async create(workspaceId: string, dto: CreateFeatureDto) {
    // Связь из тела запроса проверяем ДО записи, иначе тенант A привяжет
    // свою сущность к объекту тенанта B.
    if (dto.parentId) {
      await this.assertParentBelongsToWorkspace(workspaceId, dto.parentId);
    }

    return this.prisma.db.feature.create({
      data: {
        workspaceId,
        name: dto.name,
        ...(dto.parentId ? { parentId: dto.parentId } : {}),
      },
    });
  }

  async update(workspaceId: string, id: string, dto: Partial<CreateFeatureDto>) {
    const { count } = await this.prisma.db.feature.updateMany({
      where: { id, workspaceId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
      },
    });

    if (count === 0) throw new NotFoundException('Сущность не найдена');
    return this.getById(workspaceId, id);
  }

  async remove(workspaceId: string, id: string): Promise<void> {
    const { count } = await this.prisma.db.feature.deleteMany({ where: { id, workspaceId } });
    if (count === 0) throw new NotFoundException('Сущность не найдена');
  }

  /**
   * Необратимое действие (отправка, списание, публикация).
   *
   * Порядок шагов не произволен: идемпотентность → эффект → журнал.
   * Ключ идемпотентности приходит от клиента и уникален в пределах workspace —
   * повтор запроса (ретрай сети, двойной клик) не должен повторять эффект.
   */
  async execute(workspaceId: string, id: string, idempotencyKey: string) {
    if (!idempotencyKey) {
      throw new BadRequestException('idempotencyKey обязателен');
    }

    const existing = await this.prisma.db.featureExecution.findFirst({
      where: { workspaceId, idempotencyKey },
    });

    if (existing?.status === 'completed') {
      // Повтор возвращает сохранённый результат без побочного эффекта.
      return { ...(existing.result as object), reused: true };
    }

    const entity = await this.getById(workspaceId, id);

    const result = await this.performEffect(entity);

    await this.prisma.db.featureExecution.create({
      data: {
        workspaceId,
        idempotencyKey,
        featureId: entity.id,
        status: 'completed',
        result,
      },
    });

    this.logger.log(`feature ${entity.id} executed (workspace ${workspaceId})`);
    return { ...result, reused: false };
  }

  private async assertParentBelongsToWorkspace(workspaceId: string, parentId: string) {
    const parent = await this.prisma.db.feature.findFirst({
      where: { id: parentId, workspaceId },
      select: { id: true },
    });

    if (!parent) {
      throw new BadRequestException('Родительская сущность не найдена в этом workspace');
    }
  }

  // Заглушка под конкретный домен: здесь живёт сам эффект.
  private async performEffect(_entity: unknown): Promise<Record<string, unknown>> {
    return {};
  }
}
