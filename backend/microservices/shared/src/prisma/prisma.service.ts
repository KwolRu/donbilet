import { AsyncLocalStorage } from 'node:async_hooks';
import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prismaAdapter?: PrismaPg };

/**
 * Подключение приложения. В рантайме это ДОЛЖНА быть роль без BYPASSRLS
 * (`DATABASE_RUNTIME_URL`, создаётся `npm run db:runtime-role`), иначе
 * RLS-политики не применяются и tenant-изоляция на уровне БД не работает.
 *
 * `DATABASE_URL` (владелец таблиц) остаётся для миграций и сида.
 */
function getConnectionString(): string | undefined {
  return (
    process.env.DATABASE_RUNTIME_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL
  );
}

function getAdapter(): PrismaPg {
  if (!globalForPrisma.prismaAdapter) {
    globalForPrisma.prismaAdapter = new PrismaPg({
      connectionString: getConnectionString(),
    });
  }
  return globalForPrisma.prismaAdapter;
}

/** Транзакция текущего запроса, если он выполняется в workspace-контексте. */
const transactionStorage = new AsyncLocalStorage<Prisma.TransactionClient>();

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({ adapter: getAdapter() });
  }

  /**
   * Клиент для доменных запросов. **Используйте его вместо `this.prisma` напрямую.**
   *
   * Внутри workspace-контекста возвращает транзакцию, где уже выставлен
   * `app.current_workspace_id` — только такие запросы проходят RLS-политику.
   * Вне контекста (сид, миграции, служебные задачи) возвращает обычный клиент.
   */
  get db(): Prisma.TransactionClient | PrismaClient {
    return transactionStorage.getStore() ?? this;
  }

  /** true, если текущий код выполняется внутри workspace-транзакции. */
  get hasWorkspaceContext(): boolean {
    return transactionStorage.getStore() !== undefined;
  }

  /**
   * Выполняет `fn` в транзакции с выставленным workspace-контекстом.
   *
   * `set_config(..., true)` — параметр `is_local`: значение живёт до конца
   * транзакции и не протекает в другие запросы через пул соединений.
   *
   * Вызывается из `WorkspaceTransactionInterceptor` на каждый tenant-запрос,
   * поэтому доменные сервисы про транзакции не знают.
   */
  async runInWorkspace<T>(workspaceId: string, fn: () => Promise<T>): Promise<T> {
    if (!workspaceId) {
      throw new Error('runInWorkspace: workspaceId is required');
    }

    return this.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_workspace_id', ${workspaceId}, true)`;
      return transactionStorage.run(tx, fn);
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();

      const [{ current_user: dbUser, bypassrls: bypassRls }] = await this.$queryRaw<
        { current_user: string; bypassrls: boolean }[]
      >`SELECT current_user, rolbypassrls AS bypassrls FROM pg_roles WHERE rolname = current_user`;

      this.logger.log(`✅ Connected to PostgreSQL as "${dbUser}"`);

      // Громкое предупреждение вместо тихой дыры: с такой ролью RLS не работает.
      if (bypassRls) {
        this.logger.warn(
          `⚠ Роль "${dbUser}" обходит RLS (BYPASSRLS/superuser). Tenant-изоляция ` +
            'на уровне БД НЕ действует. Заведите runtime-роль: npm run db:runtime-role, ' +
            'затем задайте DATABASE_RUNTIME_URL.',
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      // Самая частая ошибка первого запуска: миграции прогнали, а runtime-роль
      // создать забыли. Подсказываем шаг вместо голого «authentication failed».
      const isAuthFailure = /28P01|28000|authentication failed|role .* does not exist/i.test(
        message,
      );

      if (isAuthFailure && process.env.DATABASE_RUNTIME_URL) {
        this.logger.error(
          '❌ Не удалось войти в БД под ролью приложения (DATABASE_RUNTIME_URL).\n' +
            '   Роль ещё не создана? Выполните:\n' +
            '     cd backend && npm run db:migrate:deploy && npm run db:runtime-role\n' +
            '   Пароль должен совпадать в DATABASE_RUNTIME_URL и в окружении сервисов.',
        );
      }

      this.logger.error(`❌ Failed to connect to PostgreSQL: ${message}`);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
