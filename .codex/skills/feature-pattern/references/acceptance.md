# Приёмка фичи

Правило: **«сделано» = доказано прогоном.** Не «код написан» и не «тесты зелёные» —
тест мог пройти на пустой выборке.

## Уровни проверки

| Уровень | Команда | Что доказывает |
|---|---|---|
| Типизация | `bun run build:all` (backend), `bun run build` (frontend) | Код собирается целиком, а не только изменённый файл |
| Unit | `bunx jest <файлы>` | Логика сервисов и утилит |
| Изоляция тенантов | `bun run test:rls` | Чужие данные недоступны на уровне БД |
| Живой путь | `npm run smoke` (из корня) | Система делает обещанное через gateway |
| Линт | `bun run lint` | Стиль и типовые ошибки |

Smoke-тест требует поднятого окружения: `cd backend && bun run local:up`,
затем `cd frontend && bun run dev`.

## Что проверять руками, чего тесты не покажут

- **Изоляция на новой таблице.** Создайте сущность под одним workspace и
  попробуйте достать её токеном другого — ожидаемо 404, а не 403 и не 200.
- **Пустое состояние.** Список без данных должен отличаться от загрузки: иначе
  пустой экран выглядит как вечный спиннер.
- **Повтор необратимого действия.** Двойной клик по кнопке отправки не должен
  давать два эффекта.
- **Ответ после истечения сессии.** Оставьте вкладку на час и нажмите действие:
  должен сработать refresh, а не выброс на логин.

## Чеклист приёмки

Скопировать в ответ и отметить; нерелевантные пункты — `n/a`.

```
Схема
- [ ] Правки только в schema-parts/*; db:schema:build → миграция
- [ ] Таблица несёт workspace_id, created_at, updated_at
- [ ] Составной индекс (workspace_id, status|created_at)
- [ ] В миграции дописаны RLS-блок и GIN-индекс для полей поиска
- [ ] Модель внесена в prisma/ownership/model-ownership.yml

Backend
- [ ] module / controller / service / constants / dto
- [ ] Модуль зарегистрирован в app.module.ts
- [ ] Маршрут добавлен в WorkspaceContextMiddleware.forRoutes(...)
- [ ] На контроллере @UseInterceptors(WorkspaceTransactionInterceptor)
- [ ] Запросы идут через prisma.db; вложенных $transaction нет
- [ ] where: { workspaceId } в каждом запросе
- [ ] update/delete → updateMany/deleteMany; count === 0 → 404
- [ ] Внешние id из тела проверены на принадлежность workspace
- [ ] Чужая сущность отдаёт 404, не 403
- [ ] У списка есть потолок страницы
- [ ] Статусы — константы; DTO типизированы, без any
- [ ] Необратимое действие принимает Idempotency-Key

Контракты
- [ ] Префикс добавлен в gateway proxy.routes.ts
- [ ] URL сервиса добавлен в .env.example и compose
- [ ] .proto только в shared/src/proto/
- [ ] Redis-ключи и очереди с tenant-префиксом

Frontend
- [ ] validators (zod) → api (apiClient) → store (Zustand) → страница
- [ ] Страница не вызывает api напрямую
- [ ] Состояния loading / error / empty покрыты
- [ ] Новый раздел добавлен в app/core/configs/routes.ts
- [ ] Публичный путь (если есть) внесён в lib/routing/auth-paths.ts

Проверка
- [ ] bun run build:all, bun run lint (backend)
- [ ] bun run build, bun run lint (frontend)
- [ ] bunx jest по затронутым файлам
- [ ] bun run test:rls, если добавлена tenant-таблица
- [ ] npm run smoke, если добавлен публичный эндпоинт
```

## Что писать в отчёте

Не «реализовано», а что именно проверено и как. Команда + результат:

```
bun run build:all      → 0 ошибок
bunx jest features     → 12 passed
npm run smoke          → 20 passed, 0 failed
Ручная проверка: сущность workspace A недоступна токеном workspace B (404)
```

Если что-то не проверено — сказать об этом прямо, а не умолчать.
