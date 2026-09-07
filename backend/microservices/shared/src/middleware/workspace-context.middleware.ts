import { UnauthorizedException, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

export type WorkspaceContext = {
  id: string;
};

/**
 * Резолв тенанта (workspace) из проверенного JWT.
 *
 * Тенант берётся из claim `workspace_id` — не из поддомена и не из тела запроса.
 * Значение прокидывает gateway (ActorAuth) после верификации токена в заголовке
 * `x-workspace-id`; middleware только валидирует наличие и кладёт в `req.workspace`.
 *
 * Подключается в `app.module.ts` доменного сервиса на КАЖДЫЙ tenant-маршрут:
 * `consumer.apply(WorkspaceContextMiddleware).forRoutes('projects', 'tasks')`.
 * Забыли маршрут — `req.workspace` пустой, и tenant-фильтрация молча ломается.
 *
 * См. docs/adr/ADR-0002-tenancy-workspace-isolation.md.
 */
export class WorkspaceContextMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    const workspaceId =
      (req as { user?: { workspaceId?: string } }).user?.workspaceId ??
      (req.headers['x-workspace-id'] as string | undefined)?.trim();

    if (!workspaceId) {
      throw new UnauthorizedException('Workspace not resolved: missing workspace_id');
    }

    (req as unknown as { workspace: WorkspaceContext }).workspace = { id: workspaceId };
    next();
  }
}
