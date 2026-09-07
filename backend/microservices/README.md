# Микросервисы

Каждый сервис — самостоятельное NestJS-приложение со своим `main.ts` и `app.module.ts`,
но с общими `node_modules`, `tsconfig.json`, `package.json` и единой Prisma-схемой.
Один Docker-образ на все сервисы; какой поднимется — решает `SERVICE_NAME`.

## Состав

| Сервис | Порт | Роль |
|---|---|---|
| `gateway` | 5000 | Единственная точка входа. CORS, origin-check, верификация JWT, проксирование |
| `auth-service` | 5007 | Регистрация, вход, refresh, сессии. Владеет Workspace/User/Session |
| `example-service` | 5001 | Эталонный доменный сервис (projects + tasks). Swagger `/api/docs` |
| `notification-service` | — | Скелет. Очередь BullMQ → email/SMS |
| `billing-service` | — | Скелет |
| `analytics-service` | — | Скелет |
| `shared` | — | Не сервис: общий код (auth, prisma, s3, crypto, proto, фильтры) |

## Структура сервиса

```txt
<service>/
  src/
    main.ts                 # bootstrap: health-gate, глобальные pipe/filter, порт
    app.module.ts           # сборка модулей + подключение middleware
    core/
      config/               # конфиги (swagger, jwt, s3)
      services/             # инфраструктурные сервисы (prisma, cache, token)
    modules/
      <feature>/
        <feature>.module.ts
        <feature>.controller.ts   # валидация входа → вызов сервиса → ответ
        <feature>.service.ts      # бизнес-логика, без HTTP
        <feature>.constants.ts    # статусы/коды, без magic strings
        dto/                      # request/response DTO + index.ts
    shared/                 # локальные guard-ы, декораторы, фильтры сервиса
```

## Правила

- **Бизнес-логике не место в gateway.** Он только проксирует по карте
  `gateway/src/modules/proxy/proxy.routes.ts`.
- **gRPC-контракты — только в `shared/src/proto/`.** Дублировать `.proto` в сервисах нельзя.
- **Не создавайте `database-service` / `redis-service`** — это shared infrastructure,
  а не микросервисы. Их определения — в `backend/infra` и compose-файлах.
- **Tenant-маршруты регистрируются** в `WorkspaceContextMiddleware.forRoutes(...)`
  внутри `app.module.ts` сервиса.
- **Владение моделями** фиксируется в `prisma/ownership/model-ownership.yml`:
  писать в модель может только сервис-владелец.

Подробности — в `backend/docs/adr/` и скилле `/feature-pattern`.
