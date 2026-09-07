# Gateway и контракты

## Путь запроса

```text
браузер  →  /api/features                 same-origin, httpOnly cookie сессии
         →  nginx :8080                   / → фронт, /api → gateway
         →  gateway :5000                 ActorAuth: верификация JWT,
                                          проставление x-workspace-id, x-actor-*
                                          маршрутизация по proxy.routes.ts
         →  example-service :5001         WorkspaceContextMiddleware → req.workspace
                                          WorkspaceTransactionInterceptor → SET LOCAL
                                          сервис: prisma.db + where workspaceId
```

Браузер не видит содержимого токена (обе cookie httpOnly). Доменный сервис не
доверяет заголовку тенанта от клиента: gateway затирает входящие `x-workspace-*`
собственными значениями из проверенного токена.

## Подключение нового публичного пути

Одно место — карта маршрутов. Обёрток-контроллеров на каждый префикс нет.

```ts
// gateway/src/modules/proxy/proxy.routes.ts
const EXAMPLE_SERVICE: ProxyTarget = {
  name: 'EXAMPLE',
  baseUrl: process.env.EXAMPLE_SERVICE_URL || 'http://localhost:5001',
};

export const PROXY_ROUTES: ProxyRoute[] = [
  { prefix: 'auth', target: AUTH_SERVICE },
  { prefix: 'features', target: EXAMPLE_SERVICE },   // ← добавили
];
```

Матчинг идёт от самого длинного префикса к короткому, поэтому `crm/leads`
выигрывает у `crm`. Неизвестный префикс — 404, а не 502: это ошибка конфигурации,
и она должна выглядеть иначе, чем недоступный downstream.

Новый сервис требует ещё двух правок:

1. `EXAMPLE_SERVICE_URL` в `backend/.env.example`;
2. переменная в `docker-compose.prod.yml` (в local-режиме сервисы живут на хосте).

## Чего в gateway быть не должно

- Обращений к БД и Prisma.
- Доменных решений: «если статус X, то…».
- Проверок прав уровня сущности — это знание доменного сервиса.

Gateway отвечает только за: CORS, origin-check, верификацию подписи токена,
trust-заголовки и маршрутизацию. Всё остальное — вниз по стеку (ADR-0001 §5).

## Следствие для сети

Доменные сервисы доверяют заголовкам `x-actor-*` и `x-workspace-id` без проверки
подписи — у них нет `JWT_SECRET`. Поэтому **их порты не должны быть доступны
снаружи**: прямой запрос к `:5001` с подделанным заголовком обойдёт авторизацию
целиком. В проде наружу смотрит только nginx.

## Межсервисные контракты

- `.proto` — **только** в `microservices/shared/src/proto/`. Копия внутри сервиса
  гарантированно разъедется с оригиналом.
- Общие DTO, константы и типы — в `shared/src/`; бизнес-логике там не место,
  иначе `shared` становится вторым монолитом.
- Сервис пишет только в свои модели (`prisma/ownership/model-ownership.yml`).
  Нужны чужие данные — через API/gRPC владельца, а не прямым запросом в таблицу.

## Проверка

```bash
# из корня, при поднятом окружении
npm run smoke
```

Smoke-тест проходит путь целиком: health → регистрация → вход → CRUD → refresh →
удаление → неизвестный маршрут. Добавили публичный префикс — допишите проверку туда.
