# CLAUDE.md

Инструкции для Claude Code (claude.ai/code) при работе с этим репозиторием.

## Что это

Шаблон многотенантного SaaS: NestJS-микросервисы + Next.js. Один стек обслуживает
всех тенантов; изоляция — на уровне приложения через `workspace_id` в БД и claim
`workspace_id` в JWT. Канон архитектуры — `backend/docs/adr/ADR-0001..0004`.

Если в репозитории ещё встречаются `__APP_NAME__` / `__APP_SLUG__` / `__APP_DOMAIN__` —
шаблон не развёрнут: сначала `npm run init:project` в корне.

## Архитектура (high-level)

### Backend (`backend/microservices/`)

Каждый сервис — самостоятельное NestJS-приложение со своим `main.ts` и
`app.module.ts`, но общими `node_modules`, `tsconfig.json`, `package.json` и единой
Prisma-схемой. Один Docker-образ на все сервисы, процесс выбирается `SERVICE_NAME`.

| Сервис | Порт | Роль |
|---|---|---|
| `gateway` | 5000 | Единственная точка входа. CORS, JWT, проксирование по `modules/proxy/proxy.routes.ts` |
| `auth-service` | 5007 | Регистрация/вход/refresh/сессии. Владеет Workspace, User, Session |
| `example-service` | 5001 | Эталонный домен (projects 1—N tasks). Swagger `/api/docs` |
| `notification-service` | — | Скелет: очередь BullMQ → email/SMS |
| `billing-service`, `analytics-service` | — | Скелеты |
| `shared` | — | Не сервис: общий код (auth, prisma, s3, crypto, proto, фильтры) |

Доменные сервисы поднимают `ConfigModule`, `BullModule` (общий Redis),
`PrismaModule` и регистрируют доменные модули. Глобально применяются
`ValidationPipe({ whitelist, forbidNonWhitelisted, transform })` и
`AllExceptionFilter`. Префикс всех маршрутов — `/api`.

### Tenancy

- **Одна** PostgreSQL, **одна** схема (`public`), все бизнес-таблицы несут `workspace_id`.
- Тенант резолвится из claim `workspace_id` проверенного JWT — **не** из поддомена
  и **не** из тела запроса. Заголовков вида `x-tenant-slug` в системе нет.
- `gateway` верифицирует токен и проставляет `x-workspace-id` + `x-actor-*`.
  Доменные сервисы доверяют этим заголовкам и наружу не публикуются.
- `WorkspaceContextMiddleware` в `app.module.ts` доменного сервиса подключается на
  каждый tenant-маршрут; без этого `req.workspace` пуст.
- `WorkspaceTransactionInterceptor` вешается на каждый tenant-контроллер: он
  открывает транзакцию с `app.current_workspace_id`, и только её пропускают
  RLS-политики. Доменные запросы идут через **`prisma.db`**, не через `prisma`.
- Две роли БД: `DATABASE_URL` (владелец — миграции и сид) и `DATABASE_RUNTIME_URL`
  (приложение, без `BYPASSRLS`; создаётся `npm run db:runtime-role`). Без второй
  RLS не защищает — сервис пишет об этом предупреждение при старте.
- Сессия — httpOnly-cookies `access_token` / `refresh_token`
  (`shared/src/auth/auth-cookie-names.constants.ts`). Фронт токены не читает.
- Redis: `<workspace_id>:<service>:<key>`. Очереди: `<workspace_id>__<service>__<queue>`.

### Prisma

- Каноническая `backend/prisma/schema.prisma` **генерируется** из
  `prisma/schema-parts/*.prisma` (`00-base`, `05-platform`, `10-example`, ...).
- **Не редактируй `schema.prisma` напрямую** — правь part-файл и запускай
  `npm run db:schema:build` (либо любой `db:*` скрипт, который вызывает её первой).
- Владение моделями — `prisma/ownership/model-ownership.yml`.

### Frontend (`frontend/`)

- Next.js 16 App Router, React 19, Tailwind v4, Zustand, zod, Axios с авто-refresh
  (`app/core/api/client.ts`).
- `proxy.ts` (в Next.js 16 это бывший `middleware.ts`, экспорт `proxy()`) — дешёвый
  edge-гейт по cookie сессии: закрывает `/app` без сессии и уводит с `/login` с ней.
  Подпись JWT проверяет gateway, на фронте секрета нет.
- Структура: `app/core/{api,store,validators,hooks,utils,configs,contexts}`,
  `components/ui` (базовый UI), `components/common` (составные примитивы:
  таблицы, фильтры, тулбары), `lib/routing`, `lib/env`.
- Публичные маршруты перечислены в `lib/routing/auth-paths.ts` — один источник
  правды для `proxy.ts` и API-клиента.

### Edge

`deploy/nginx/app.conf` подключается через compose: `/` → frontend, `/api` → gateway,
same-origin. Прямой порт gateway для отладки — `GATEWAY_PORT` (обычно 5100).

## Часто используемые команды

Backend-команды — из `backend/`, frontend-команды — из `frontend/`.

### Локальный запуск

**В Docker — только инфраструктура** (nginx, postgres, redis). Сервисы и
фронтенд запускаются процессами на хосте: правки подхватываются без пересборки
образов. Контейнерный запуск всего — только прод (`docker-compose.prod.yml`).

```powershell
npm run init:project             # один раз: подставить имя проекта

cd backend
bun run local:up                 # инфра + миграции + runtime-роль + все сервисы в watch
bun run local:down               # остановить всё

cd frontend
bun run dev                      # Next.js на :3000
```

Точка входа приложения — nginx: `http://localhost:8080` (same-origin для cookies).
Только инфраструктура, без сервисов: `npm run infra:up` из корня.

### Отдельный сервис

```bash
cd backend
bun run start:gateway            # 5000
bun run start:auth               # 5007
bun run start:example            # 5001
bun run start:example:watch      # с hot-reload через nodemon
```

### База данных

Изменения схемы — **только** в `backend/prisma/schema-parts/`, потом:

```bash
cd backend
bun run db:schema:build      # пересобрать schema.prisma из частей
bun run db:generate          # build + prisma generate
bun run db:migrate           # build + prisma migrate dev
bun run db:migrate:deploy    # для прода — единственная допустимая команда
bun run db:migrate:reset     # сброс + пересид
bun run db:push              # черновые итерации локально, без миграции
bun run db:seed:base         # workspace + владелец
bun run db:seed:dev          # base + демо-данные example-домена
bun run db:runtime-role      # роль приложения без BYPASSRLS (после миграций)
bun run db:studio
bun run db:status
```

Сид требует `SEED_OWNER_EMAIL` и `SEED_OWNER_PASSWORD` в env.

### Линт / тесты / сборка

```bash
# backend
bun run build:all                                  # tsc по всем сервисам — главная проверка
bun run lint
bun run test                                           # Jest, rootDir = microservices
bunx jest path/to/file.spec.ts
bun run test:rls                                   # негативный тест tenant-изоляции в БД

# корень: smoke-тест поднятого стека (health, auth, CRUD, маршрутизация)
npm run smoke

# frontend
bun run lint
bun run build
bun run dev
```

## Соглашения, которые легко упустить

- **Не правь `prisma/schema.prisma` руками** — он перегенерируется. Меняй `schema-parts/*.prisma`.
- **Не клади бизнес-логику в `gateway`** — он только проксирует. Новый сервис =
  запись в `proxy.routes.ts` + переменная окружения с URL.
- **Не создавай `database-service` / `redis-service`** — это shared infrastructure
  (ADR-0001 §2).
- **gRPC-контракты — только в `microservices/shared/src/proto/`**, дублировать нельзя.
- **Tenant-фильтрация — в каждом запросе.** Новый модуль с tenant-данными
  добавляется в `WorkspaceContextMiddleware.forRoutes(...)` в `app.module.ts` сервиса,
  а его контроллер получает `@UseInterceptors(WorkspaceTransactionInterceptor)`.
- **Доменные запросы — через `prisma.db`**, не `this.prisma.<model>` напрямую:
  иначе запрос уйдёт вне workspace-транзакции и RLS вернёт ноль строк.
- **Обновление/удаление — через `updateMany`/`deleteMany`** с `{ id, workspaceId }`
  в `where`: `update` не умеет фильтровать по тенанту (ADR-0002 §5).
- **Идентификаторы из тела запроса проверяй на владение** — эталон
  `TasksService.assertProjectBelongsToWorkspace`.
- **Никаких magic strings** для статусов/ролей/прав — только константы (`*.constants.ts`).
- **Новая tenant-таблица** → блок RLS в миграции (шаблон в
  `00000000000002_rls_and_search_indexes`) + запись в `model-ownership.yml`.
- **Поле, по которому ищут** → GIN-индекс на `pg_trgm` в той же миграции (ADR-0004).
- **Поток данных на фронте строго `page/component → store → api`** — страницы не
  вызывают api-клиенты напрямую.
- **Среда исполнения — Windows**: dev-скрипты на PowerShell (`backend/scripts/*.ps1`),
  `init-project.mjs` кроссплатформенный.
- **Секреты не логируются** — ни токены, ни пароли, ни OTP.

## Управление реализацией по утверждённому ТЗ

Для плановых фаз и крупных изменений обязателен workflow `/roadmap-execution`:

- `audit/ROADMAP.md` — утверждённый scope, фазы, зависимости и критерии приёмки;
- `audit/CURRENT.md` — единственный оперативный источник правды о том, что фактически
  готово, проверено, выполняется или заблокировано;
- `audit/reports/` — подробные evidence и handoff по фазам или PR.

В начале плановой работы прочитать `ROADMAP.md`, затем `CURRENT.md` и только связанные
с активной фазой reports. Не расширять roadmap без явного утверждения владельца. Статус
`verified` допустим только после воспроизводимой проверки; команды и результаты
фиксируются в report. После значимого handoff сначала обновляется report, затем
`CURRENT.md`. При параллельной работе исполнители создают отдельные reports, а
`CURRENT.md` обновляет координатор интеграции.

## Скиллы

Состав портфеля описан в `.claude/skills-manifest.yaml`: для каждого скилла —
источник, режим, обязательность, куда синхронизируется и с чем пересекается.
Там же раздел `excluded` с причинами отказа — чтобы вопрос «а почему этого нет»
не всплывал заново.

```bash
npm run skills:check     # состав, целостность, расхождения копий
npm run skills:sync      # разложить копии в .codex и .gemini
```

**Ядро (подключается автоматически):**

- `/feature-pattern` — сквозной путь новой фичи: Prisma → backend-модуль →
  gateway → frontend-цепочка → чеклист приёмки. Есть `assets/module-template/`
  для копирования и `references/` по каждому этапу.
- `/figma-to-front` — вёрстка из figma-to-code → production-фронт: переиспользование
  `components/ui` и `components/common`, токены `global.css`, дата-слой
  validators → api → store. Дизайн-систему **не задаёт** — она своя в каждом продукте.
- `coding-standards`, `api-design`, `database-migrations`, `security-review`,
  `verification-loop` — общие практики.

**По области** (срабатывают только в своей): `nestjs-best-practices`,
`postgres-patterns`, `docker-patterns`, `deployment-patterns`, `e2e-testing`,
`vercel-react-best-practices`, `vercel-composition-patterns`,
`web-design-guidelines`, `platform-architecture`, `ai-layer-architecture`,
`ai-evals-ops`, `data-ingestion`, `outbound-messaging`.

**Только вручную** (`disable-model-invocation: true`, не занимают контекст):

- `/project-skill-architect` — пересборка портфеля скиллов.
- `/roadmap-execution` — работа по утверждённому ТЗ через `audit/ROADMAP.md`.

## ADR

- `ADR-0001` — границы сервисов, shared-инфраструктура, роль gateway.
- `ADR-0002` — мультитенантность: workspace, три рубежа изоляции, RLS.
- `ADR-0003` — сборка Prisma-схемы из частей, стратегия миграций.
- `ADR-0004` — поиск на PostgreSQL (pg_trgm/tsvector) вместо отдельного движка.

## Поведение ассистента

- Перед выполнением сырого, неструктурированного или многозначного запроса
  сначала уточнить требования, scope и критерии приёмки — вопросами в формате
  выбора ответа, а не догадками.
- После каждого ответа показывать оставшийся свободный контекст (в токенах и
  процентах от 1M).
