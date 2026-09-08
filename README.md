# DonBilet

Шаблон многотенантного SaaS: **NestJS-микросервисы + Next.js 16**.
Один стек на всех тенантов, изоляция через `workspace_id`.

```
backend/          NestJS: gateway, auth, example-service, скелеты сервисов, shared
frontend/         Next.js 16 App Router, React 19, Tailwind v4, Zustand, zod
deploy/traefik/   Edge: / → frontend, /api → gateway (same-origin), HTTPS в проде
scripts/          init-project.mjs, smoke-test.mjs
.claude/skills/   Скиллы агента: feature-pattern, figma-to-front
```

**Модель запуска.** Локально в Docker только инфраструктура (traefik, postgres,
redis) — сервисы и фронтенд работают процессами на хосте с hot-reload. В проде
в контейнерах уже всё (`docker-compose.prod.yml`).

---

## Развернуть шаблон под новый проект

> Этот раздел удаляется после первого запуска.

**1. Подставить имя проекта.** В репозитории расставлены плейсхолдеры
`DonBilet`, `donbilet`, `donbilet.ru`:

```bash
npm run init:project
# или без вопросов:
npm run init:project -- --name "Acme Portal" --slug acme-portal --domain acme.ru
# посмотреть, что изменится, ничего не трогая:
npm run init:project:dry
```

Скрипт идемпотентен: повторный запуск ничего не найдёт.

**2. Завести окружение.**

```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

cd backend && npm run gen-jwt     # → JWT_SECRET в backend/.env
openssl rand -hex 32              # → CRYPTO_KEY в backend/.env и .env
```

Задайте `SEED_OWNER_EMAIL` и `SEED_OWNER_PASSWORD` — без них сид не создаст владельца.

**3. Поднять окружение.**

В Docker живёт только инфраструктура — traefik, postgres, redis. Сервисы и
фронтенд запускаются с хоста, чтобы правки подхватывались без пересборки образов.

```bash
# бэкенд: инфраструктура + миграции + все сервисы в watch-режиме
cd backend && bun install
bun run local:up

# фронтенд — отдельным терминалом
cd frontend && bun install
bun run dev
```

`bun run local:up` сам поднимет docker-compose, дождётся postgres, прогонит
миграции, создаст runtime-роль БД и запустит каждый сервис в своём окне.
Демо-данные: `bun run db:seed:dev` (чистый старт — `db:seed:base`).

Открыть: `http://localhost:8080` (через nginx, same-origin).
Swagger: `http://localhost:5001/api/docs`.

Проверить, что всё живо:

```bash
npm run smoke                  # из корня: health, авторизация, CRUD, маршрутизация
cd backend && bun run test:rls # изоляция тенантов на уровне БД
```

Остановить: `cd backend && bun run local:down`.

**4. Убрать эталон, когда появится реальный домен.**

`example-service` существует только как образец. Удаляются вместе:

- `backend/microservices/example-service/`
- `backend/prisma/schema-parts/10-example.prisma`
- блок `seedExampleDomain` в `backend/prisma/seed.ts`
- записи `projects`/`tasks` в `gateway/src/modules/proxy/proxy.routes.ts`
- npm-скрипты `start:example*` и сервис `example-service` в compose-файлах
- строки `Project` / `Task` в `prisma/ownership/model-ownership.yml`

**5. Удалить этот раздел и `scripts/init-project.mjs`.**

---

## Ежедневные команды

| Команда | Где | Что делает |
|---|---|---|
| `bun run local:up` | `backend/` | Инфраструктура + миграции + все сервисы в watch |
| `bun run local:down` | `backend/` | Остановить сервисы и инфраструктуру |
| `bun run dev` | `frontend/` | Next.js на :3000 + прокси `/api` → gateway |
| `bun run start:example:watch` | `backend/` | Один сервис отдельно |
| `bun run build:all` | `backend/` | Типизация всех сервисов — главная проверка |
| `bun run db:migrate` | `backend/` | Новая миграция из `schema-parts/` |
| `bun run test:rls` | `backend/` | Негативный тест tenant-изоляции |
| `bun run db:studio` | `backend/` | Просмотр БД |
| `npm run smoke` | корень | Smoke-тест поднятого окружения |
| `npm run infra:up` / `infra:down` | корень | Только инфраструктура, без сервисов |
| `bun run build` | `frontend/` | Прод-сборка с типизацией |

Полный список — в `CLAUDE.md`.

## Что уже решено за вас

| Тема | Решение | Где |
|---|---|---|
| Мультитенантность | `workspace_id` из JWT, три рубежа изоляции: фильтр в коде → транзакционный контекст → RLS с отдельной ролью БД | ADR-0002 |
| Границы сервисов | Gateway только проксирует; реестр владения моделями | ADR-0001 |
| Схема БД | Сборка из part-файлов, baseline-миграции | ADR-0003 |
| Поиск | pg_trgm + GIN вместо отдельного движка | ADR-0004 |
| Авторизация на фронте | httpOnly-cookies, один refresh с mutex, cooldown, cross-tab синк | `app/core/api/client.ts` |
| Загрузка файлов | Multipart через backend-прокси (обход CORS у S3-провайдеров) | `app/core/api/uploadMultipart.ts` |
| Ошибки сервера | Глобальный фильтр на бэке, `ServerErrorBoundary` на фронте | — |

## Скиллы агента

Портфель описан в `.claude/skills-manifest.yaml` — источник, режим, обязательность
и пересечения для каждого скилла:

| Режим | Что это |
|---|---|
| `automatic` | Ядро: подключается само. `feature-pattern`, `figma-to-front`, `coding-standards`, `api-design`, `database-migrations`, `security-review`, `verification-loop` |
| `conditional` | По области: backend, инфраструктура, фронт, AI, сбор данных, рассылки |
| `optional` | Можно удалить без последствий |
| `manual` | Только явный вызов `/<name>`, контекст не занимают |

```bash
npm run skills:check     # целостность портфеля и расхождения копий
npm run skills:sync      # разложить копии в .codex и .gemini
```

Дизайн-система в шаблон **не входит**: она своя под каждый продукт. Переносимы
только практики (`figma-to-front`, `web-design-guidelines`).

## Как добавлять фичи

Используйте скилл `/feature-pattern` — он держит сквозной путь и чеклист приёмки:

```
Prisma part-файл → миграция + RLS → модуль сервиса → регистрация маршрута
→ карта gateway → api → store → validators → страница
```

Для вёрстки из Figma — `/figma-to-front`.

Эталон, с которого копируются новые модули: `backend/microservices/example-service/`
(см. его README — там перечислено, что именно демонстрируется).

## Русская локаль (опционально)

Шаблон включает готовые RU-утилиты. Не нужны — удалите одним заходом:

- `frontend/app/core/data/russian-cities.json`, `russian-timezones.ts`
- `frontend/app/core/utils/russian-plural.ts`
- `frontend/app/core/validators/phone.ts`
- `frontend/components/ui/city-input.tsx`, `phone-input.tsx`
- зависимости `fuzzball`, `react-imask`, `imask`, `timezones-list`

## Стек

**Backend:** NestJS 11, Prisma 7, PostgreSQL 17, Redis + BullMQ, gRPC, Argon2, S3.
**Frontend:** Next.js 16 (App Router), React 19, Tailwind v4, Zustand, zod,
react-hook-form, Axios, TanStack Virtual, Lucide.
**Инфраструктура:** Docker Compose (local/prod), nginx, GitHub Container Registry.
