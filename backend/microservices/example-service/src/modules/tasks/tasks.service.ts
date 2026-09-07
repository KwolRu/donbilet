import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type Task } from '@prisma/client';
import { PrismaService } from '../../core/services/prisma/prisma.service';
import type {
  CreateTaskDto,
  ListTasksQueryDto,
  TaskListResponseDto,
  TaskResponseDto,
  UpdateTaskDto,
} from './dto';

/**
 * Вторая половина эталона: связанная сущность (Task принадлежит Project).
 *
 * Дополнительно к tenant-фильтрации показывает проверку владения связью —
 * перед созданием задачи проверяем, что указанный projectId принадлежит тому же
 * workspace. Без этой проверки тенант A привяжет задачу к проекту тенанта B.
 */
@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  async list(workspaceId: string, query: ListTasksQueryDto): Promise<TaskListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.TaskWhereInput = {
      workspaceId,
      ...(query.projectId ? { projectId: query.projectId } : {}),
      ...(query.status?.length ? { status: { in: query.status } } : {}),
      ...(query.search
        ? { title: { contains: query.search, mode: 'insensitive' as const } }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.db.task.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.db.task.count({ where }),
    ]);

    return { items: rows.map(toResponse), total, page, limit };
  }

  async getById(workspaceId: string, id: string): Promise<TaskResponseDto> {
    const task = await this.prisma.db.task.findFirst({ where: { id, workspaceId } });

    if (!task) {
      throw new NotFoundException('Задача не найдена');
    }

    return toResponse(task);
  }

  async create(workspaceId: string, dto: CreateTaskDto): Promise<TaskResponseDto> {
    await this.assertProjectBelongsToWorkspace(workspaceId, dto.projectId);

    const task = await this.prisma.db.task.create({
      data: {
        workspaceId,
        projectId: dto.projectId,
        title: dto.title,
        ...(dto.status ? { status: dto.status } : {}),
        dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
      },
    });

    return toResponse(task);
  }

  async update(
    workspaceId: string,
    id: string,
    dto: UpdateTaskDto,
  ): Promise<TaskResponseDto> {
    const { count } = await this.prisma.db.task.updateMany({
      where: { id, workspaceId },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.dueAt !== undefined ? { dueAt: dto.dueAt ? new Date(dto.dueAt) : null } : {}),
      },
    });

    if (count === 0) {
      throw new NotFoundException('Задача не найдена');
    }

    return this.getById(workspaceId, id);
  }

  async remove(workspaceId: string, id: string): Promise<void> {
    const { count } = await this.prisma.db.task.deleteMany({ where: { id, workspaceId } });

    if (count === 0) {
      throw new NotFoundException('Задача не найдена');
    }
  }

  private async assertProjectBelongsToWorkspace(workspaceId: string, projectId: string) {
    const project = await this.prisma.db.project.findFirst({
      where: { id: projectId, workspaceId },
      select: { id: true },
    });

    if (!project) {
      throw new BadRequestException('Проект не найден в этом workspace');
    }
  }
}

function toResponse(task: Task): TaskResponseDto {
  return {
    id: task.id,
    projectId: task.projectId,
    title: task.title,
    status: task.status,
    dueAt: task.dueAt,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
}
