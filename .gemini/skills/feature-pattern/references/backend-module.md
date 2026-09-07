# Доменный модуль микросервиса

Живой эталон — `backend/microservices/example-service/src/modules/projects`
(одиночная сущность) и `.../tasks` (связанная). Шаблон для копирования —
`assets/module-template/`.

## Структура

```text
microservices/<service>/src/modules/<feature>/
  <feature>.module.ts
  <feature>.controller.ts     # валидация входа → вызов сервиса → формат ответа
  <feature>.service.ts        # бизнес-логика, без привязки к HTTP
  <feature>.constants.ts      # статусы, коды — не magic strings
  dto/
    create-<feature>.dto.ts
    update-<feature>.dto.ts
    list-<feature>.query.dto.ts
    <feature>.response.dto.ts
    index.ts
```

## Модуль или новый сервис?

По умолчанию — **модуль в существующем сервисе**. Новый микросервис оправдан,
только если у части системы свой профиль нагрузки, свой цикл релизов или внешняя
интеграция, падение которой не должно ронять основной API (ADR-0001 §1).
Разделить модуль на сервис дёшево; склеить обратно — нет.

## Три обязательных подключения

Пропуск любого — молчаливая поломка, а не ошибка сборки:

1. **Модуль в `app.module.ts`** сервиса (`imports`).
2. **Маршрут в `WorkspaceContextMiddleware.forRoutes(...)`** там же — иначе
   `req.workspace` пуст.
3. **`@UseInterceptors(WorkspaceTransactionInterceptor)`** на контроллере —
   иначе запросы уйдут вне workspace-транзакции и RLS вернёт ноль строк
   (ADR-0002 §3).

## Контроллер

Отвечает за: валидацию входа (DTO + глобальный `ValidationPipe`), извлечение
`workspaceId` из проверенного JWT, формат ответа. Ничего больше.

```ts
@ApiTags('Features')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UseInterceptors(WorkspaceTransactionInterceptor)
@Controller('features')
export class FeatureController {
  @Get()
  list(@CurrentUser() user: JwtPayload, @Query() query: ListFeatureQueryDto) {
    return this.feature.list(user.workspaceId, query);
  }
}
```

- `workspaceId` — **только** из `@CurrentUser()`. Не из query, не из body,
  не из заголовка: иначе тенант подделывается клиентом.
- `ParseUUIDPipe` на `:id` — мусорный идентификатор не должен доходить до БД.
- `@ApiOperation` на каждый метод: Swagger поднят в `example-service` (`/api/docs`).
- Формат ошибок — глобальный `AllExceptionFilter`, свои shape не изобретать.

## Сервис

Бизнес-логика без знания об HTTP: ни `Request`, ни `Response`.

Обязательные правила работы с БД:

| Правило | Почему |
|---|---|
| Запросы через `prisma.db` | Это транзакция с workspace-контекстом; обычный `prisma` вернёт пусто под RLS |
| `where: { workspaceId }` в каждом запросе | Первый и основной рубеж изоляции |
| `findFirst({ id, workspaceId })`, не `findUnique({ id })` | `findUnique` вернёт чужую строку, и её забудут отфильтровать |
| `updateMany` / `deleteMany` с `{ id, workspaceId }` | `update` не умеет фильтровать по тенанту; `count === 0` → 404 |
| Чужая сущность → **404**, не 403 | 403 подтверждает существование чужого id |
| Внешние id из тела — проверять на владение | Иначе тенант A привяжет свою сущность к объекту тенанта B |
| Вложенный `$transaction` невозможен | Уже внутри транзакции интерцептора; используйте `Promise.all` |

## Пагинация и фильтры

Форма ответа списка одинакова во всех модулях — `{ items, total, page, limit }`.
У списка всегда есть потолок страницы (`Math.min(limit, MAX_PAGE_SIZE)`), иначе
`?limit=100000` кладёт сервис.

Мультивыбор в query поддерживает обе формы записи (`?status=a,b` и
`?status=a&status=b`) через `toStringArrayQuery` из `core/utils/query-array.util`.

## Необратимые действия

Отправка, списание, публикация — всё, что нельзя откатить кнопкой «назад»:

```text
идемпотентность → эффект → журнал
```

Ключ идемпотентности приходит от клиента (заголовок `Idempotency-Key`), уникален
в пределах workspace и **детерминирован по бизнес-смыслу**. Случайный ключ на
каждый клик означает, что идемпотентности нет.

## Константы вместо литералов

Статусы, роли, коды — в `<feature>.constants.ts`:

```ts
export const FEATURE_STATUSES = ['draft', 'active', 'archived'] as const;
export type FeatureStatus = (typeof FEATURE_STATUSES)[number];
```

Значения дублируют Prisma-enum намеренно: DTO и Swagger не должны зависеть от
сгенерированного клиента.

## Проверка

```bash
cd backend
bun run build:all      # типизация всех сервисов — главная проверка
bun run lint
bunx jest <файлы>
```
