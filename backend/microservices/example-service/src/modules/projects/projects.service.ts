import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/services/prisma/prisma.service';
import type {
  CreateProjectDto,
  ListProjectsQueryDto,
  ProjectListResponseDto,
  ProjectResponseDto,
  UpdateProjectDto,
} from './dto';

/**
 * Эталон доменного сервиса шаблона.
 *
 * Главный инвариант: `workspaceId` приходит параметром из контроллера (из проверенного
 * JWT) и участвует в КАЖДОМ запросе к БД — и в чтении, и в записи. Никакой метод не
 * принимает id сущности без workspaceId: иначе тенант A прочитает данные тенанта B.
 * Бизнес-логика не знает про HTTP — ни Request, ни Response здесь не появляются.
 *
 * Запросы идут через `prisma.db`, а не через `prisma` напрямую: это транзакция
 * с выставленным `app.current_workspace_id`, только её пропускают RLS-политики
 * (ADR-0002 §3). Обычный `this.prisma.project` вернул бы ноль строк.
 */
@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    workspaceId: string,
    query: ListProjectsQueryDto,
  ): Promise<ProjectListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.ProjectWhereInput = {
      workspaceId,
      ...(query.status?.length ? { status: { in: query.status } } : {}),
      ...(query.search
        ? { name: { contains: query.search, mode: 'insensitive' as const } }
        : {}),
    };

    // Оба запроса уже идут внутри workspace-транзакции (её открывает
    // WorkspaceTransactionInterceptor), поэтому снимок данных согласован —
    // вкладывать ещё один $transaction нельзя и не нужно.
    const [rows, total] = await Promise.all([
      this.prisma.db.project.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { _count: { select: { tasks: true } } },
      }),
      this.prisma.db.project.count({ where }),
    ]);

    return { items: rows.map(toResponse), total, page, limit };
  }

  async getById(workspaceId: string, id: string): Promise<ProjectResponseDto> {
    const project = await this.prisma.db.project.findFirst({
      where: { id, workspaceId },
      include: { _count: { select: { tasks: true } } },
    });

    if (!project) {
      throw new NotFoundException('Проект не найден');
    }

    return toResponse(project);
  }

  async create(workspaceId: string, dto: CreateProjectDto): Promise<ProjectResponseDto> {
    const project = await this.prisma.db.project.create({
      data: {
        workspaceId,
        name: dto.name,
        description: dto.description ?? null,
        ...(dto.status ? { status: dto.status } : {}),
      },
      include: { _count: { select: { tasks: true } } },
    });

    return toResponse(project);
  }

  async update(
    workspaceId: string,
    id: string,
    dto: UpdateProjectDto,
  ): Promise<ProjectResponseDto> {
    // updateMany, а не update: у Prisma `update` бьёт по уникальному ключу и не умеет
    // фильтровать по workspaceId — проверка владения должна быть частью запроса.
    const { count } = await this.prisma.db.project.updateMany({
      where: { id, workspaceId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
      },
    });

    if (count === 0) {
      throw new NotFoundException('Проект не найден');
    }

    return this.getById(workspaceId, id);
  }

  async remove(workspaceId: string, id: string): Promise<void> {
    const { count } = await this.prisma.db.project.deleteMany({ where: { id, workspaceId } });

    if (count === 0) {
      throw new NotFoundException('Проект не найден');
    }
  }
}

type ProjectRow = Prisma.ProjectGetPayload<{
  include: { _count: { select: { tasks: true } } };
}>;

function toResponse(project: ProjectRow): ProjectResponseDto {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    status: project.status,
    tasksCount: project._count.tasks,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
}
