-- ============================================================================
-- Tenant-изоляция на уровне БД (RLS) + индексы поиска.
--
-- Модель доступа:
--   * МИГРАЦИИ и СИД идут под ролью-владельцем таблиц. Она НЕ подчиняется
--     политикам (RLS включён без FORCE) — иначе миграции не смогли бы менять
--     данные без workspace-контекста.
--   * ПРИЛОЖЕНИЕ в рантайме ходит под ролью `app_runtime` (создаётся ниже,
--     без BYPASSRLS). Для неё политики обязательны.
--   * Контекст выставляется в начале транзакции:
--       SELECT set_config('app.current_workspace_id', '<uuid>', true);
--     Это делает PrismaService.runInWorkspace() — см. shared/src/prisma.
--
-- Политики fail-closed: если контекст НЕ выставлен, current_setting вернёт NULL,
-- сравнение даст NULL, и запрос увидит НОЛЬ строк. Забыть про контекст можно —
-- получить чужие данные нельзя.
--
-- При добавлении новой tenant-таблицы скопируйте для неё блок «tenant table».
-- ============================================================================

-- ─── Роль приложения ─────────────────────────────────────────────────────────
-- Групповая роль без LOGIN и без BYPASSRLS. Логин-пользователь с паролем
-- создаётся отдельно (npm run db:runtime-role) и включается в эту группу,
-- чтобы пароль не попал в миграцию и в историю git.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_runtime') THEN
    CREATE ROLE app_runtime NOLOGIN;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO app_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_runtime;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_runtime;

-- Таблицы, созданные будущими миграциями, получат те же права автоматически.
-- Без этого каждая новая таблица была бы недоступна приложению до ручного GRANT.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO app_runtime;

-- ─── tenant table: projects ──────────────────────────────────────────────────
ALTER TABLE "projects" ENABLE ROW LEVEL SECURITY;

CREATE POLICY workspace_isolation ON "projects"
  USING ("workspace_id" = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspace_id" = current_setting('app.current_workspace_id', true));

-- ─── tenant table: tasks ─────────────────────────────────────────────────────
ALTER TABLE "tasks" ENABLE ROW LEVEL SECURITY;

CREATE POLICY workspace_isolation ON "tasks"
  USING ("workspace_id" = current_setting('app.current_workspace_id', true))
  WITH CHECK ("workspace_id" = current_setting('app.current_workspace_id', true));

-- ─── Платформенные таблицы ───────────────────────────────────────────────────
-- `workspaces`, `users`, `sessions` НЕ покрываются политикой по workspace_id:
-- auth-service обязан читать их ДО того, как тенант определён (это и есть логин).
-- Их изоляция обеспечивается кодом auth-service, а не RLS.

-- ============================================================================
-- Индексы поиска на pg_trgm.
--
-- Покрывают `contains` + `mode: 'insensitive'` из Prisma (ILIKE '%...%'),
-- который без GIN-индекса деградирует в seq scan на первых же десятках тысяч
-- строк. См. docs/adr/ADR-0004-search-in-postgres.md.
-- ============================================================================

CREATE INDEX "projects_name_trgm_idx" ON "projects" USING GIN ("name" gin_trgm_ops);
CREATE INDEX "tasks_title_trgm_idx" ON "tasks" USING GIN ("title" gin_trgm_ops);
