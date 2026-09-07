---
name: feature-pattern
description: >-
  Сквозной паттерн новой фичи в монорепе NestJS + Prisma + Next.js: доменный
  модуль сервиса, Prisma schema-parts, tenant-изоляция по workspace_id, RLS,
  маршрут в gateway, gRPC-контракты в shared/proto, frontend-цепочка
  api → store → validators → UI → route, единый чеклист приёмки.
  Использовать при добавлении фичи, backend-модуля, HTTP-эндпоинта, gRPC-метода,
  таблицы/модели БД, frontend-страницы или store, а также при любой работе с
  tenant-данными (всё, что несёт workspace_id).
argument-hint: "[описание фичи]"
---

# Паттерн новой фичи

Единый путь от Prisma-схемы до frontend-страницы. Канон — `CLAUDE.md` и
`backend/docs/adr/ADR-0001..0004`; этот скилл — исполняемая выжимка.

Живой эталон, с которого копируются модули: `backend/microservices/example-service/`
(модули `projects` и `tasks`). Если сомневаешься, как оформить — смотри туда,
а не выдумывай.

## Выбор сценария

- **Полная фича** → все разделы по порядку: Prisma → Backend → Gateway → Frontend → Чеклист.
- **Только backend / эндпоинт** → «Prisma flow» (если нужна таблица) + «Backend flow» + «Gateway» + «Чеклист».
- **Только схема БД** → «Prisma flow» + «Чеклист».
- **Только frontend** → «Frontend flow» + «Чеклист»; вёрстка из Figma — `/figma-to-front`.
- **Новый микросервис** → сначала прочитай ADR-0001 §1: скорее всего нужен модуль,
  а не сервис.

## Инварианты (сверх CLAUDE.md)

Базовые правила (schema-parts, «gateway только проксирует», gRPC только в
`shared/src/proto/`, tenant-фильтрация, tenant-префиксы Redis/очередей) — в
`CLAUDE.md`, они действуют всегда. Дополнительно:

- Никаких magic strings для статусов/ролей/прав — только константы (`*.constants.ts`)
  и enum. Значения дублируются с Prisma-enum осознанно: DTO и Swagger не должны
  зависеть от сгенерированного клиента.
- JWT, cookie, S3, Prisma, guard-ы не переизобретать в фиче — брать из
  `<service>/src/core/services/*` или `microservices/shared/src/`.
- В прод — только `npm run db:migrate:deploy`, никогда `db push`.
- Секреты (токены, пароли, OTP) не попадают в логи и не пишутся в БД мимо
  `shared/src/crypto`.

## Prisma flow

1. Менять только `backend/prisma/schema-parts/*.prisma`. Доменный part выбирается
   по владельцу модели; крупный новый домен → отдельный part `20-<domain>.prisma`
   (нумерация с шагом 10).
2. Каждая бизнес-таблица несёт `workspace_id`, `created_at`, `updated_at` и
   составной индекс `(workspace_id, status)` и/или `(workspace_id, created_at)`.
3. Связь внутри тенанта — с `onDelete: Cascade`. Поля — `@map("snake_case")`,
   таблица — `@@map`.
4. Применить: `cd backend && npm run db:schema:build && npm run db:migrate`.
5. **Дописать в миграцию руками** (Prisma это не генерирует):
   - блок RLS для новой tenant-таблицы — шаблон в
     `prisma/migrations/00000000000002_rls_and_search_indexes`;
   - GIN-индекс `gin_trgm_ops` на поля, по которым будет поиск (ADR-0004).
6. Зафиксировать владение в `prisma/ownership/model-ownership.yml` (scope + сервис).

## Backend flow

1. **Модуль или новый сервис?** По умолчанию — модуль в существующем сервисе.
   Новый сервис только при своём профиле нагрузки / цикле релизов / внешней
   интеграции (ADR-0001 §1).
2. **Структура** `backend/microservices/<service>/src/modules/<feature>/`:
   ```text
   <feature>.module.ts
   <feature>.controller.ts     # валидация входа → вызов сервиса → ответ
   <feature>.service.ts        # бизнес-логика, без HTTP
   <feature>.constants.ts      # статусы/коды
   dto/                        # request/response DTO + index.ts
   ```
3. **Зарегистрировать** модуль в `app.module.ts` сервиса. Если модуль работает с
   tenant-данными, нужны ДВА подключения:
   - маршрут в `WorkspaceContextMiddleware.forRoutes(...)` в `app.module.ts` —
     иначе `req.workspace` пуст;
   - `@UseInterceptors(WorkspaceTransactionInterceptor)` на контроллере — иначе
     запросы уйдут вне workspace-транзакции и RLS вернёт ноль строк.
4. **Запросы к БД — через `prisma.db`**, а не `this.prisma.<model>`: `db` внутри
   контекста возвращает транзакцию с выставленным `app.current_workspace_id`.
   Внутри неё вложенный `$transaction([...])` невозможен — используйте
   `Promise.all` или последовательные `await`, атомарность уже обеспечена.
5. **Каждый запрос к БД** — с явным `where: { workspaceId }`. Изменение и удаление —
   через `updateMany`/`deleteMany` с `{ id, workspaceId }`, не через `update`/`delete`.
6. **Идентификаторы из тела запроса** (`projectId`, `parentId`, …) проверять на
   принадлежность тому же workspace до записи — эталон
   `TasksService.assertProjectBelongsToWorkspace`.
7. **`workspaceId` берётся из `@CurrentUser()`** (проверенный JWT), никогда из
   тела/query — иначе тенант подделывается клиентом.
8. **Формат ошибок и ответов** — глобальные `AllExceptionFilter` и `ValidationPipe`,
   свои shape не изобретать. Swagger — в `example-service` (`/api/docs`).
9. **Межсервисное** — `.proto` только в `shared/src/proto/`, общие DTO/константы —
   в `shared/src/`.

## Gateway

Новый публичный префикс → запись в `gateway/src/modules/proxy/proxy.routes.ts`
плюс переменная окружения с URL сервиса (в `.env.example` и обоих compose-файлах).
Никакой бизнес-логики и обёрток-контроллеров на префикс — карта одна.

## Frontend flow (Next.js App Router)

Поток данных строго **page/component → store → api**; страницы api-клиенты
напрямую не вызывают.

1. **API-клиент** — `frontend/app/core/api/<resource>.ts`, поверх `apiClient`.
   Заголовки тенанта не добавляются: workspace живёт в JWT.
2. **Store** — `frontend/app/core/store/<resource>.ts` (Zustand): единственное
   место вызова api, владеет `loading`/`error`. Эталон — `store/notifications.ts`.
3. **Валидаторы** — `frontend/app/core/validators/<resource>.ts` (zod);
   переиспользуемые схемы не объявлять внутри страниц.
4. **UI** — переиспользовать `frontend/components/ui/*` и составные примитивы из
   `frontend/components/common/*` (таблицы, фильтры, тулбары, drawer-ы).
   Детали маппинга вёрстки и токенов — `/figma-to-front`.
5. **Страница** — в своей route-группе. Защищённая зона — под `/app`
   (гейт в `proxy.ts`), публичные пути перечисляются в `lib/routing/auth-paths.ts`.
   Route-локальные `components/`, `hooks/`, `utils/` — только если специфичны
   для маршрута.
6. **Server/Client** — по умолчанию Server Component; `"use client"` только на
   интерактивных листьях, не на всей странице.
7. **Новый раздел** → подпись в `app/core/configs/routes.ts`, иначе не будет
   крошек и корректного заголовка на странице ошибки.

## Чеклист приёмки

Скопировать в ответ и отметить перед сдачей (нерелевантные пункты — `n/a`):

```
- [ ] Схема: правки в schema-parts/*, db:schema:build → миграция
- [ ] Таблица несёт workspace_id + created_at/updated_at + составной индекс
- [ ] В миграции дописаны RLS-блок и GIN-индекс для поиска
- [ ] Модель внесена в prisma/ownership/model-ownership.yml
- [ ] Backend: module/controller/service/constants/dto; зарегистрирован в app.module.ts
- [ ] Маршрут добавлен в WorkspaceContextMiddleware.forRoutes(...)
- [ ] На контроллере @UseInterceptors(WorkspaceTransactionInterceptor)
- [ ] Запросы идут через prisma.db; вложенных $transaction нет
- [ ] Все запросы к БД фильтруют workspaceId; update/delete → updateMany/deleteMany
- [ ] Внешние id из тела проверены на принадлежность workspace
- [ ] DTO типизированы, без any; статусы — константы; guard подключён
- [ ] Redis-ключи / очереди с tenant-префиксом
- [ ] gRPC: .proto только в shared/src/proto/
- [ ] Gateway: префикс в proxy.routes.ts + env с URL в .env.example и compose
- [ ] Frontend: api → store (Zustand) → validators (zod); страницы не зовут api
- [ ] Страница в правильной route-группе; UI из components/ui и components/common
- [ ] Состояния loading / error / empty покрыты
- [ ] Нет бизнес-логики в gateway
- [ ] backend: npm run build:all, npm run lint, npx jest <файлы>
- [ ] frontend: npm run lint, npm run build
```

## Anti-patterns

- Новый микросервис там, где хватало модуля.
- `prisma.update({ where: { id } })` на tenant-таблице — тенант не проверен.
- `workspaceId` из тела запроса или query-параметра.
- Прямое чтение чужой таблицы вместо вызова API сервиса-владельца.
- Дубликат `.proto` внутри сервиса.
- Забытый маршрут в `WorkspaceContextMiddleware` — фильтрация молча ломается.
- `this.prisma.model` вместо `this.prisma.db.model` — запрос вне транзакции,
  RLS вернёт пустой результат, и это будет выглядеть как «данные пропали».
- Новая tenant-таблица без RLS-блока в миграции.
- Вызов api напрямую из страницы в обход store.
