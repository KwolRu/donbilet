# Ф0 — Развёртывание шаблона и локальной инфраструктуры

- Roadmap: версия `1`, phase `Ф0`, items `Ф0.1`, `Ф0.2`, `Ф0.3`, `Ф0.10`, `Ф0.11`
- Дата: 2026-09-07
- Ветка: `main`
- Commit/PR: не создан (изменения в рабочем дереве)

## Scope

Развернуть шаблон `arch-saas` под DonBilet, поднять локальную инфраструктуру до
состояния «стек проходит smoke», свести planning-документы в штатный `audit/`-workflow,
заменить edge с nginx на Traefik согласно §7 целевой архитектуры, заложить
дизайн-независимый дата-слой публичной части.

Не входило: доступы к прод-окружению, golden-тесты legacy API, хотфиксы безопасности,
аудит раздела Авиа — все они заблокированы отсутствием доступов (item'ы Ф0.4–Ф0.9).
Вёрстка главной не начиналась: нет макета (блокер B6).

## Что изменено

### Развёртывание шаблона

`node scripts/init-project.mjs --name "DonBilet" --slug donbilet --domain donbilet.ru`
— 36 замен в 18 файлах. Плейсхолдеров `__APP_NAME__` / `__APP_SLUG__` / `__APP_DOMAIN__`
в репозитории не осталось.

### Окружение

- `.env` и `backend/.env` созданы из `.example`, секреты сгенерированы криптостойко:
  `JWT_SECRET` (48 байт base64url), `CRYPTO_KEY` (32 байта hex), `INTERNAL_RPC_SECRET`,
  `RUNTIME_DB_PASSWORD`, `SEED_OWNER_PASSWORD`.
- Оба файла покрыты `.gitignore` (строки 12, 15) — в репозиторий не попадают.
- `frontend/.env` не создавался: `frontend/lib/env/api-public-base.ts` работает на
  дефолтах (same-origin через nginx), отдельный файл не требуется.

### База данных

- 3 миграции применены: `init_extensions`, `init`, `rls_and_search_indexes`.
- Prisma-клиент сгенерирован (v7.10.0). Схема собрана из 3 part-файлов.
- Runtime-роль `app_user` создана — без `BYPASSRLS`, включена в группу `app_runtime`.
- Сид `dev` выполнен: workspace, владелец `owner@donbilet.ru`, 1 демо-проект, 3 задачи.

### Инфраструктура

Docker Compose (`docker-compose.local.yml`): traefik `:8080`, postgres `:5433`,
redis `:6379` — все healthy. Сервисы запущены процессами на хосте согласно модели
шаблона: gateway `:5000`, auth-service `:5007`, example-service `:5001`,
frontend `:3000`.

### Edge: nginx → Traefik (item Ф0.10)

Шаблон приехал с nginx. Целевая архитектура §7 фиксирует Traefik — заменён.

| | Было | Стало |
|---|---|---|
| Локально | `deploy/nginx/app.local.conf`, upstream'ы на `host.docker.internal` | `deploy/traefik/traefik.local.yml` + file-провайдер `dynamic/local.yml` |
| Прод | `deploy/nginx/app.conf` + том `/etc/letsencrypt` | `deploy/traefik/traefik.prod.yml` + Docker-провайдер, labels на контейнерах, ACME-резолвер |
| Маршруты | `location /api` / `location /` | Роутеры с явными приоритетами: `/api` = 100, `/` = 1 |
| Сертификаты | внешний certbot | Let's Encrypt внутри Traefik, том `letsencrypt` |
| Дашборд | нет | `:8081` локально; в проде `traefik.${APP_DOMAIN}` за basic-auth |

Приоритеты роутеров заданы явно (`priority: 100` / `priority: 1`), а не через
длину правила: порядок маршрутизации должен читаться из конфига, а не выводиться
из внутренней сортировки Traefik.

Каталог `deploy/nginx/` удалён. Переменные `NGINX_HTTP_PORT` → `TRAEFIK_HTTP_PORT`,
добавлены `TRAEFIK_DASHBOARD_PORT`, `APP_DOMAIN`, `ACME_EMAIL`, `TRAEFIK_DASHBOARD_AUTH`.
Упоминания nginx обновлены в `CLAUDE.md`, `README.md`, `next.config.ts`,
`api/client.ts`, `lib/env/api-public-base.ts`, ADR-0005.

WebSocket отдельной настройки не потребовал — Traefik апгрейдит соединение
прозрачно. Это снимает будущую работу в Ф7 (чат поддержки).

**Потеряно при замене:** дружелюбная 503-страница «Upstream is not running.
Start it on the host», которую отдавал nginx, когда процессы на хосте не подняты.
Traefik в этой ситуации отдаёт стандартный 502. Мелочь, но при старте работы
сообщение было полезным.

### Дата-слой публичной части (item Ф0.11)

Заложен контракт gateway для главной и поиска — дизайн-независимая часть Ф3.
Реализуется `legacy-adapter` в Ф2, затем `transport-service`/`content-service`
в Ф11/Ф6 без изменений на фронте.

| Файл | Что |
|---|---|
| `app/core/validators/transport.ts` | `City`, `Trip`, `SearchResult`, `TripDetails`, схема формы поиска |
| `app/core/validators/content.ts` | `PopularDirection`, `DirectionTile`, `NewsItem`, `NewsPage`, `Banner`, `FaqCategory` |
| `app/core/api/transport.ts` | `fetchDepartureCities`, `fetchArrivalCities`, `searchTrips`, `fetchTripDetails` |
| `app/core/api/content.ts` | `fetchPopularDirections`, `fetchDirectionTiles`, `fetchBanners`, `fetchNews`, `fetchNewsItem`, `fetchFaq` |
| `app/core/store/trip-search.ts` | Стор формы поиска: города, дата, пассажиры, валидация |
| `lib/routing/public-paths.ts` | Карта публичных маршрутов, зоны, редиректы со старых URL |

Контракт сознательно расходится с legacy — расхождения зафиксированы в комментариях
к схемам:

- ответ поиска — объект, а не массив `[{races,topraces},{mincost,nextdate}]`,
  который клиент разбирал по индексам (docs/03 §3.1);
- дата в ISO `YYYY-MM-DD` вместо `DD.MM.YYYY`;
- ни `apikey`, ни `apitoken` в запросах — учётные данные остаются на сервере
  (docs/07, S2/S3);
- деньги — целые копейки, а не число с плавающей точкой;
- изображения — абсолютные URL, а не ссылки с боевым токеном в query.

Поля схем заземлены на реальные модели legacy-фронта (`races.model.ts`,
`departures.model.ts`, `popular-cities.model.ts`), а не выдуманы.

Ответы валидируются zod на границе api-модулей: на фазах Ф2–Ф10 данные идут через
`legacy-adapter`, нормализующий `List<Map<String,Object>>`, и сбой нормализации
должен падать сразу и явно, а не превращаться в `undefined` посреди рендера.

Состояние поиска: канонические параметры — в URL, стор держит только рабочее
состояние формы. Это уход от legacy, где воронка была размазана по 15 query-
параметрам, cookies и sessionStorage одновременно (docs/04 §4.6).

### Консолидация planning-документов

Созданные накануне `Current.md` и `reports/` в корне репозитория дублировали штатный
workflow из `CLAUDE.md`. Удалены; содержание перенесено в `audit/ROADMAP.md` и
`audit/CURRENT.md`. Развёрнутое обоснование фаз осталось в `docs/plan-tz/roadmap.md`,
на который `audit/ROADMAP.md` ссылается.

`audit/ROADMAP.md` переведён из `awaiting_approval` в `approved`, версия `1`:
перенесено ТЗ Приложения № 1, зафиксированы решения R1–R7, 18 фаз в двух треках.

## Решения и отклонения

| # | Решение | Причина |
|---|---|---|
| 1 | Реализация ведётся на шаблоне `arch-saas`, а не на монорепо из §44 целевой архитектуры | Шаблон уже в репозитории, даёт gateway, auth, RLS, UI-кит из 83 компонентов. Структура (`backend/microservices/`, `frontend/`) отличается от §44 (`apps/`, `backend/`, `packages/`) — расхождение принято, требует ADR |
| 2 | `audit/` вместо корневых `Current.md` и `reports/` | Конвенция репозитория из `CLAUDE.md`, раздел «Управление реализацией по утверждённому ТЗ» |
| 3 | `example-service` пока не удалён | Служит рабочим эталоном домена для `/feature-pattern`. Удаляется, когда появится первый доменный сервис DonBilet |

### Выявленное расхождение, требующее решения (Q6)

Шаблон рассчитан на **многотенантный SaaS**: изоляция через `workspace_id` в каждой
бизнес-таблице, RLS-политики, `WorkspaceContextMiddleware` на каждом tenant-маршруте.

DonBilet — **B2C-платформа с одним владельцем**: публичный поиск анонимен, покупатели
не тенанты, сотрудники CRM — один workspace. Механика тенантности даст колонку с
одним и тем же значением во всех таблицах и накладные расходы на каждом запросе.

Варианты: (а) один служебный workspace для всех данных; (б) tenancy только для
CRM-данных, публичные домены без неё; (в) убрать tenancy из шаблона.

Решение нужно **до Ф5** (customer-service) — первого доменного сервиса с бизнес-данными.
До этого момента вопрос ни на что не влияет. Внесён в `audit/ROADMAP.md` как Q6.

## Verification evidence

| Рабочая директория | Команда | Результат | Что доказано |
|---|---|---|---|
| корень | `node scripts/init-project.mjs --name "DonBilet" --slug donbilet --domain donbilet.ru` | 36 замен в 18 файлах | Шаблон развёрнут |
| корень | `grep -rl "__APP_NAME__\|__APP_SLUG__\|__APP_DOMAIN__"` | пусто | Плейсхолдеров не осталось |
| корень | `docker compose -f docker-compose.local.yml ps` | traefik, postgres (healthy), redis (healthy) | Инфраструктура поднята |
| корень | `curl http://localhost:8080/` | `200`, `<title>DonBilet</title>` | Traefik проксирует `/` на фронт |
| корень | `curl http://localhost:8080/api/health` | `{"status":"ok","service":"gateway"}` | Traefik проксирует `/api` на gateway |
| корень | `curl http://localhost:8081/api/http/routers` | `api@file` prio=100, `frontend@file` prio=1, оба `enabled` | Приоритеты роутеров применены, `/api` выигрывает |
| корень | `curl http://localhost:8081/api/http/services` | `gateway@file → host.docker.internal:5200` | Traefik проксирует на новый порт после рестарта |
| корень | `npm run smoke` (после переноса портов) | **20 passed, 0 failed** | Стек работоспособен на диапазоне 52xx; чужой gateway больше не перехватывает трафик |
| `frontend/` | `npx tsc --noEmit` | без ошибок | Дата-слой типизируется |
| `frontend/` | `bun run lint` | 0 errors, 4 warnings | Ошибок нет; предупреждения — в готовых компонентах шаблона, не в новом коде |
| `backend/` | `bun run db:migrate:deploy` | 3 миграции применены | Схема БД актуальна |
| `backend/` | `bun run db:runtime-role` | роль `app_user` создана без BYPASSRLS | Предусловие работы RLS |
| `backend/` | `bun run db:seed:dev` | workspace, владелец, 1 проект, 3 задачи | Сид работает |
| `backend/` | `bun run build:all` | без ошибок | Все сервисы компилируются |
| `backend/` | `bun run test:rls` | **7 passed, 0 failed** | Tenant-изоляция на уровне БД работает: чужие строки не читаются, не обновляются, не удаляются; INSERT с чужим `workspace_id` отклоняется; без контекста — fail-closed |
| корень | `npm run smoke` | **20 passed, 0 failed** | Health, регистрация, вход, cookies, CRUD projects/tasks, refresh, 401 без сессии, 404 на неизвестный префикс, отказ в доступе к чужому `projectId` |

Логи старта сервисов подтверждают: auth-service подключился к PostgreSQL как
`app_user` (то есть под ролью без `BYPASSRLS` — RLS активен), gateway поднял
проксирование, frontend слушает `:3000` с прокси на `127.0.0.1:5000`.

## Инциденты в ходе фазы

### И1. Коллизия портов с соседним проектом

**Что произошло.** После успешного smoke (20/20) процесс gateway DonBilet
завершился с кодом 255 без стека — был снят, а не упал на ошибке. Освободившийся
`:5000` немедленно занял gateway **другого проекта**, работающего на той же машине
(в списке процессов видны его `collector-service`, `crm-service`, `ai-service`,
`channels-service`).

**Чем это опасно.** Внешне стек выглядел живым: `GET /api/health` отвечал
`200 {"status":"ok","service":"gateway"}`, потому что у чужого gateway тот же
health-эндпоинт. Обнаружилось только повторным прогоном smoke: `/projects` и
`/tasks` давали 404 — их нет в чужой карте маршрутов. Утверждение «стек работает»
на основании одного health-чека в такой ситуации ложно.

**Причина.** Шаблон по умолчанию занимает 5000/5001/5007. Соседний стек занимает
5000, 5001, 5006, 5007, 5008, 5009, 5011, 5040. Комментарий в `.env.example` про
разведение портов между проектами относился только к инфраструктуре
(`NGINX_HTTP_PORT`, `POSTGRES_PORT`), а порты сервисов в `backend/.env` остались
дефолтными.

**Что сделано.** DonBilet переведён на свободный диапазон 52xx:

| Сервис | Было | Стало |
|---|---|---|
| gateway | 5000 | **5200** |
| example-service | 5001 | **5201** |
| auth-service | 5007 | **5207** |
| notification / analytics / billing (скелеты) | 5006 / 5005 / 5004 | 5206 / 5205 / 5204 |
| auth gRPC | 51071 | **51207** |

Обновлены `backend/.env`, `backend/.env.example`, `deploy/traefik/dynamic/local.yml`,
`frontend/next.config.ts`, `frontend/server.js`, `frontend/lib/env/api-public-base.ts`,
`CLAUDE.md`. Чужие процессы не останавливались — остановлены только три процесса
DonBilet по явным PID.

### И2. Traefik не перечитал конфигурацию по `watch`

**Что произошло.** После правки `deploy/traefik/dynamic/local.yml` (порт gateway
5000 → 5200) Traefik продолжил проксировать на `:5000`. Smoke дал 2 passed,
2 failed с `502 Bad Gateway - AUTH Service unavailable`.

**Причина.** `providers.file.watch: true` полагается на inotify. Docker bind-mount
на Windows эти события не передаёт, поэтому автоперечитывание не работает.

**Что сделано.** `docker compose restart traefik`. Правило внесено в `CLAUDE.md`
вместе с командой проверки фактических целей:
`curl http://localhost:8081/api/http/services`.

**Вывод для дальнейшей работы.** Health-чек gateway не является доказательством
того, что поднят нужный стек. Достаточным доказательством считается `npm run smoke`
целиком — он проверяет доменные маршруты, а не только живость процесса.

## Риски, долги и блокеры

### Блокеры

Все требуют действий заказчика, перечислены в `audit/CURRENT.md`:
дамп боевой БД, конфигурация прода, credentials перевозчиков и платёжных шлюзов,
доступ к хостингу и Search Console, логи веб-сервера, Figma, информация о разделе Авиа,
доступ к трафику мобильного приложения.

### Долги

| # | Долг | Когда закрыть |
|---|---|---|
| D1 | Структура репозитория расходится с §44 целевой архитектуры | ADR до Ф2 |
| D2 | Вопрос многотенантности для B2C (Q6) | до Ф5 |
| D3 | `example-service` — демо-домен шаблона | удалить в Ф5 |
| D4 | Раздел «Развернуть шаблон» в `README.md` и `scripts/init-project.mjs` | удалить после первого коммита фазы |
| D5 | 7 хотфиксов безопасности в боевом legacy (H1–H7) | Ф0, после получения доступов |

### Риски

| Риск | Влияние | Митигация |
|---|---|---|
| Доступы задерживаются → Ф0 не закрывается, Ф1 стартует без разведки | Ф3 и Ф4 придётся делать без golden-тестов, растёт риск регрессий | Эскалация по п. 6 ТЗ (3 рабочих дня). Ф1 (дизайн-система) от доступов не зависит и может идти параллельно |
| Многотенантность шаблона окажется неподходящей и потребует переделки | Переработка каркаса после Ф5 | Решить Q6 до Ф5, зафиксировать ADR |

## Следующий шаг

1. **Заблокировано доступами:** items Ф0.4–Ф0.9.
2. **Не заблокировано:** Ф1 — дизайн-система. Требует Figma от заказчика.
3. **Требует решения владельца:** Q6 (многотенантность) — до Ф5, но лучше зафиксировать ADR сейчас.

Немедленный следующий шаг — получить Figma и начать Ф1; параллельно эскалировать
доступы для разблокировки остатка Ф0.
