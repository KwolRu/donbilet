import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  UnauthorizedException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { PrismaService } from './prisma.service';

/**
 * Оборачивает обработку tenant-запроса в транзакцию с выставленным
 * `app.current_workspace_id`. Только внутри неё RLS-политики пропускают строки
 * (см. миграцию `00000000000002_rls_and_search_indexes`).
 *
 * Подключается вместе с `WorkspaceContextMiddleware`: middleware извлекает
 * тенанта из проверенного JWT, интерцептор открывает под него транзакцию.
 * Доменные сервисы про транзакции не знают — они ходят через `prisma.db`.
 *
 * Цена: одна транзакция на запрос, включая GET. Транзакция на чтение дешёвая,
 * а альтернатива (`SET` без `LOCAL`) протекает между запросами через пул
 * соединений и приводит к выдаче чужих данных.
 */
@Injectable()
export class WorkspaceTransactionInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest<{ workspace?: { id?: string } }>();
    const workspaceId = request?.workspace?.id;

    if (!workspaceId) {
      // Маршрут объявлен tenant-скоупным, но контекста нет: либо маршрут не
      // добавлен в WorkspaceContextMiddleware.forRoutes(), либо токен без claim.
      throw new UnauthorizedException('Workspace context is missing');
    }

    // Транзакция должна жить, пока выполняется handler, поэтому дожидаемся
    // результата здесь и отдаём готовое значение — иначе транзакция закроется
    // раньше, чем подписчик Observable дойдёт до запросов.
    const result = await this.prisma.runInWorkspace(workspaceId, async () =>
      firstValueFromHandler(next),
    );

    return new Observable((subscriber) => {
      subscriber.next(result);
      subscriber.complete();
    });
  }
}

function firstValueFromHandler(next: CallHandler): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const subscription = next.handle().subscribe({
      next: (value) => {
        settled = true;
        resolve(value);
        subscription.unsubscribe();
      },
      error: reject,
      complete: () => {
        if (!settled) resolve(undefined);
      },
    });
  });
}
