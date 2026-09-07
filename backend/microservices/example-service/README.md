# example-service

Эталонный доменный сервис шаблона. Его задача — показать полный путь фичи и служить
образцом для копирования, а не остаться в проекте навсегда.

## Что внутри

| Модуль | Назначение |
|---|---|
| `modules/projects` | CRUD + фильтры + пагинация. Эталон одиночной сущности |
| `modules/tasks` | Связанная сущность (`Task` → `Project`). Эталон проверки владения связью |
| `modules/health` | Проверка БД/Redis. Есть в каждом сервисе |

Prisma-модели — `prisma/schema-parts/10-example.prisma`.

## Что здесь показано

- `workspaceId` в **каждом** запросе к БД — и на чтение, и на запись.
- `updateMany`/`deleteMany` вместо `update`/`delete`: владение проверяется внутри
  запроса, а не отдельным `findUnique` перед ним.
- Проверка владения связью: `projectId` из тела запроса валидируется против
  `workspaceId` до создания задачи.
- Статусы — константы (`*.constants.ts`), не magic strings.
- Контроллер без бизнес-логики, сервис без HTTP.
- `WorkspaceContextMiddleware.forRoutes('projects', 'tasks')` в `app.module.ts`.

## Запуск

```bash
npm run start:example         # без watch
npm run start:example:watch   # с hot-reload
```

Swagger: `http://localhost:5001/api/docs`

## Как использовать как заготовку

1. Скопируйте `modules/projects` в `modules/<ваша-сущность>`.
2. Добавьте модель в новый part-файл `prisma/schema-parts/20-<domain>.prisma`.
3. Зарегистрируйте модуль в `app.module.ts` и добавьте его маршрут в
   `WorkspaceContextMiddleware.forRoutes(...)`.
4. Пропишите маршрут в `gateway/src/modules/proxy/proxy.routes.ts`.

Подробный чеклист — скилл `/feature-pattern`.

## Когда удалять

Как только появился первый настоящий доменный сервис: удалите папку сервиса,
`10-example.prisma`, демо-блок в `prisma/seed.ts`, npm-скрипты `start:example*`
и запись в `proxy.routes.ts`.
