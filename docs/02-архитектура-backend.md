# 02. Архитектура backend

## 2.1. Модель модулей (OSGi-бандлы)

Backend — не самостоятельное приложение, а **набор плагинов к ERP iDempiere 7.1**. Он не имеет собственного `main`, собственного пула соединений и собственного HTTP-сервера: всё это предоставляет платформа iDempiere.

| Бандл | Symbolic name | Роль | Точка входа |
|---|---|---|---|
| `ru.siberium.models` | `ru.siberium.models.model.factory` | Модель данных + фасады внешних API | SCR-компонент `SiberiumModelFactory` (`OSGI-INF/ModelFactory.xml`, `service.ranking=100`) |
| `ru.siberium.donbilet.webservices` | `ru.siberium.donbilet.webservices` | REST API сайта и мобильных клиентов | Web-бандл, `Web-ContextPath: DBInterface`, активатор `org.idempiere.webservices.Activator` |
| `ru.siberium.personalaccount` | `ru.siberium.personalaccount` | Legacy-модуль «Барнаул» (ЖКХ ЛК) + копия билетного API | `Web-ContextPath: SIBInterface` |
| `ru.siberium.processes` | `ru.siberium.processes` | Фоновые/пакетные процессы | `IProcessFactory` → `SiberiumProcessesFactory` |
| `ru.siberium.callouts` | `ru.siberium.callouts` | Callout'ы форм iDempiere | `ICalloutFactory` → `SiberiumCalloutFactory` |
| `ru.siberium.dbapi` | (обычный JAR/JPMS-модуль) | Клиенты API перевозчиков | Библиотека, подключается как `ru.siberium.dbapi-0.0.1-SNAPSHOT.jar` |

**Граф зависимостей:**

```
webservices ──┬──> models ──> dbapi
              └──> iDempiere (org.adempiere.base, org.adempiere.ui)
processes  ───┴──> models, webservices (common.MainConfig)
callouts   ──────> iDempiere
personalaccount ─> models (обособленно, дублирует webservices)
```

`ru.siberium.processes` импортирует `ru.siberium.donbilet.common.MainConfig` из бандла webservices — фоновые процессы зависят от web-модуля. Это инверсия нормального направления зависимостей.

## 2.2. Слоистость REST-модуля `donbilet.webservices`

```
WEB-INF/src/ru/siberium/donbilet/
├── service/ws/          ← Resource-классы JAX-RS (@Path). 22 класса.
├── service/services/    ← «Сервисы» с бизнес-логикой. 15 классов.
├── service/providers/   ← CXF RequestHandler/ResponseHandler (auth, JSON-валидация)
├── service/annotations/ ← @LoginRequired, @Logout, @ValidateJSON
├── service/request/     ← 4 request-DTO (используются только частью эндпоинтов)
├── service/response/    ← SibResponse, SimpleResponse, AuthenticateResponse
├── service/jsonvalidator/ ← SchemasHub (кеш JSON-схем)
├── dal/pojo/            ← 8 POJO (LKSubscriber, PersonalAccount, Location…)
├── common/              ← платежи, отправка email/SMS, конфиг, вызовы внешних API
└── webservices/         ← MyHttpGetWithEntity (GET с телом запроса)
```

Плюс внутри бандла лежит **вендоренная копия iDempiere WebServices** (`org/idempiere/adinterface`, `org/idempiere/webservices`, `com/trekglobal/ws`, `net/sf/compilo`) — стандартный SOAP/REST-слой ERP, скопированный в проект вместе с патчами.

### Что означает «слой» на практике

Разделение декларативное, а не реальное:

- Resource-классы содержат бизнес-код: проверку api-ключа, маппинг кодов ошибок, форматирование сообщений (`ReserveResource` — 400+ строк).
- Сервисы (`SearchService`, `ReserveService`) напрямую работают с моделями iDempiere (`new MSchedule(Env.getCtx(), id, null)`), делают HTTP-вызовы к перевозчикам, форматируют даты и печатают в `System.out`.
- **DTO отсутствуют**: почти все методы возвращают `List<Map<String, Object>>`. Контракт API нигде не типизирован и не документирован — форма ответа определяется тем, какие ключи положили в `HashMap`.

Пример из `SearchService.getSearch()`: результат — список из двух разнородных элементов (`[0]` = `{topraces, races}`, `[1]` = `{mincost, nextdate}`), и фронтенд разбирает его по индексам (`response[0].races`, `response[1]`).

## 2.3. Конфигурация HTTP-слоя

Всё поднимается CXF-сервлетом из `WEB-INF/web.xml`:

```xml
<servlet-mapping>
  <servlet-name>CXFServlet</servlet-name>
  <url-pattern>/services/*</url-pattern>
</servlet-mapping>
<session-config><session-timeout>15</session-timeout></session-config>
```

Spring-контекст: `META-INF/cxf/services.xml` (SOAP) + `META-INF/cxf/barnaul/rest-context.xml` (REST). Каталог `barnaul` — след того, что модуль отпочковался от проекта ЖКХ Барнаула.

В `rest-context.xml` объявлены два JAX-RS сервера:

| ID | Адрес | Назначение |
|---|---|---|
| `idempiereRest` | `/rest` | Стандартные `ModelADServiceImpl` и `CompositeServiceImpl` iDempiere (CRUD по любой таблице ERP) |
| `siberiumDonbiletRest` | `/donbilet/V2` | Публичное API DonBilet |

Полный публичный префикс: `/DBInterface/services/donbilet/V2`.

**Провайдеры, зарегистрированные на `/donbilet/V2`** (порядок важен):

1. `AuthorizationRequestProvider` — аутентификация по заголовку `X-Crfs-token`
2. `AuthorizationResponseProvider` — возврат токена в ответе
3. `JSONValidatorProvider` — валидация тела по JSON Schema
4. `JacksonJsonProvider` (codehaus 1.9) — сериализация
5. `CrossOriginResourceSharingFilter` — CORS

Зарегистрировано только 11 из 22 существующих Resource-классов. Не подключены, то есть **мертвы**: `AcceptCodeRestful`, `AddressOfPersonalAccountResource`, `CitiesResource`, `FileResource`, `LocationRestful`, `MeteringDevicesResource`, `PersonalAccountResource`, `TicketResource`, `TestRestful`, `ValueMeterReadingResource`.

### CORS

Помимо CXF-фильтра, каждый Resource наследуется от `CorseRestful` — базового класса с `@Path("{var:.*}")` и обработчиком `OPTIONS`. В `AuthorizationRequestProvider` заголовок `Access-Control-Allow-Origin: *` проставляется вручную в ответе 403. Три параллельных механизма CORS.

## 2.4. Аутентификация и авторизация

Две независимые схемы, применяемые одновременно.

### Схема A — ключ приложения (`apikey` / `apitoken`)

Передаются **в query string каждого запроса**. Фронтенд добавляет их глобально в `TokenInterceptor`:

```ts
request = request.clone({ setParams: { apikey: environment.apiKey, apitoken: environment.apiToken } });
```

Проверка на бэкенде выполняется вручную в каждом методе:

```java
Integer apiid = MSIBFrontendAPI.getAPIId(apikey);
if (apiid == 0) return Response.status(403).build();
MSIBFrontendAPI api = new MSIBFrontendAPI(Env.getCtx(), apiid, null);
if (api.getapitoken().equals(apitoken)) { ... } else return Response.status(403).build();
```

Ключи хранятся в таблице `sib_frontendapi`. Единого фильтра нет — проверка копипастится, часть эндпоинтов её не делает вовсе (`Search`, `Departures`, `MainResource.getFaq` и др. вызывают `getAPIId` непоследовательно).

`MSIBFrontendAPI.getAPIId()` собирает SQL конкатенацией — SQL-инъекция через `apikey` (см. [07](07-риски-и-техдолг.md)).

### Схема B — сессия пользователя (`X-Crfs-token`)

Работает поверх аннотации `@LoginRequired` и провайдера `AuthorizationRequestProvider`:

```
POST /authenticate/login  { loginName, credData }
   → LoginService.get(ctx, login, password)   (проверка пароля, см. ниже)
   → MSessionsSib.getOrCreateSesion(httpSessionId, userId)
   → session.setTTL(40320)  // 28 суток, захардкожено с комментарием «потом в конфиг»
   → session.setXCrfsToken(UUID.randomUUID())
   → ответ: заголовки X-Crfs-token, SID + тело AuthenticateResponse
```

Далее каждый запрос к методу с `@LoginRequired`:

```
X-Crfs-token → AuthenticateProcessor.getSIDByToken()
                 ├─ ConcurrentHashMap-кеш в памяти (tokenSessionInfo)
                 └─ фолбэк в БД: MSessionsSib.findByToken()
             → проверка TTL (created + ttl > now)
             → MUser → httpRequest.setAttribute("user", user)
```

Неуспех → `403 {"error":"Сессия устарела или не найдена"}`.

**Проверка пароля** (`ru.siberium.utils.LoginService.get` — копия метода из iDempiere): ищет `AD_User` по `Name` или `EMail` (в зависимости от `MSysConfig.USE_EMAIL_FOR_LOGIN`), затем:

```java
if (system.isLDAP() && !Util.isEmpty(user.getLDAPUser()))  valid = system.isLDAP(name, password);
else if (hash_password)                                    valid = user.authenticateHash(password);
else                                                       valid = user.getPassword().equals(password);
```

Если системный параметр `USER_PASSWORD_HASH` выключен, пароли сравниваются **в открытом виде** — то есть хранятся в БД нехешированными. Параллельно существует собственная утилита `PasswordProcessor.generateHash()` на **MD5 без соли**, используемая в `MUserSib.setProtectedPassword()` и `MLKSubscriber.getUserByProtectedPassword()` (альтернативный путь аутентификации, закомментированный в `AuthenticateResource`).

Особенности:
- Кеш сессий — `ConcurrentHashMap` **в памяти узла**, без вытеснения и без ограничения размера. Горизонтальное масштабирование сломает логаут (инвалидация не распространяется на другие узлы), а долгая работа даст утечку памяти.
- `checkConfirmation()` (проверка подтверждения email) **закомментирована** — параметр `@LoginRequired(confirm=…)` фактически ничего не делает.
- `AuthorizationResponseProvider` возвращает клиенту тот же токен в заголовке; при `@Logout` — пустую строку.
- Ролевой модели нет. Есть только «залогинен / не залогинен».

### Валидация тела: `@ValidateJSON`

`JSONValidatorProvider` перехватывает запрос, читает `InputStream`, валидирует по схеме из `WEB-INF/jsonSchemas/` (`SchemasHub` — синглтон-кеш) и кладёт сырую строку в `request.setAttribute("requestDatat", …)`. Ресурс потом читает её обратно:

```java
String data = (String) request.getAttribute("requestDatat");
JsonNode dataJson = new ObjectMapper().readTree(data);
```

То есть Jackson-провайдер обходится стороной, десериализация в объект не делается. Схем всего четыре: `login.schema`, `acceptCode.schema`, `abonentRequests.schema`, `test.schema` — то есть валидируются 2–3 эндпоинта из ~60.

## 2.5. Конфигурация приложения

Класс `ru.siberium.donbilet.common.MainConfig` — синглтон с double-checked locking, читающий **таблицу `SIB_C_Barnaul_Config`** (модель `MBarnaulConfig`) в статический `HashMap` один раз за жизнь JVM:

```java
MainConfig.getByKey("API_URL");
MainConfig.getByKeyAsInteget("EMAIL_PORT");
```

Известные ключи: `API_URL`, `RESERVE_RESULT`, `PAYLER_KEY`, `PAYLER_PASS`, `PAYLER_URL`, `EMAIL_FROM`, `EMAIL_PASS`, `EMAIL_USER`, `EMAIL_HOST`, `EMAIL_PORT`.

Проблемы: значения кешируются **навсегда** (изменение в ERP требует перезапуска), `valueStorage` — статическое поле, инициализируемое в конструкторе экземпляра; секреты (пароль SMTP, ключи Payler) лежат в обычной таблице БД без шифрования. Часть URL всё равно захардкожена прямо в коде (`https://www.donbilet.ru/WSv2/reserve/merchantcallback`, `https://donbilet.ru/callback`, ссылки на `getimage` с реальным `apitoken` в `MainService`).

## 2.6. Доступ к данным

Единственный слой доступа — модели iDempiere из `ru.siberium.models`:

- `X_*` — сгенерированные ORM-обёртки над таблицами (`X_sib_tickets`, `X_sib_order`, …)
- `I_*` — интерфейсы к ним (константы колонок)
- `M_*` — «модели» с ручной бизнес-логикой поверх `X_*`

Три способа обращения к БД сосуществуют:

1. `new Query(ctx, TABLE, whereClause, trxName).setParameters(...).firstOnly()` — параметризованный, правильный;
2. `DB.prepareStatement("select … where apiname='" + apiname + "'")` — конкатенация, уязвимая;
3. Вызов хранимых процессов ERP через `MProcess`/`MPInstance`/`ProcessInfo` (`SearchService` запускает процессы iDempiere для расчётов).

Транзакции: собственная утилита `TrxUtil.gen_TrxName()` / `TrxUtil.transactionProcess()`, вызываемая вручную в отдельных методах. Единой транзакционной границы на уровне запроса нет; ошибка в середине оформления заказа оставит частично записанные данные.

## 2.7. Фоновые процессы (`ru.siberium.processes`)

Все — наследники `org.compiere.process.SvrProcess`, регистрируются через `SiberiumProcessesFactory` и запускаются планировщиком iDempiere (AD_Scheduler) или вручную из UI ERP. 37 классов:

**Загрузчики расписаний по перевозчикам** (`*loader` + `*dir_binder` — «связыватель направлений»):
`DBloader`/`DBdir_binder` (собственный API), `BFloader`/`BFdir_binder` (BusFor), `ABloader`/`ABAloader`/`ABNLoader`/`ABProloader` (семейство AviBus), `RBloader`/`RBdir_binder` (RegionBilet), `Krasloader`/`Krasdir_binder`, `YHLoader`/`YHdir_binder` (Yahont), `BILdir_binder` (Biletik), `BRdir_binder`/`BusRoutedir_binder`, `ETdir_binder` (ETrafik).

**Операционные:**
- `UpdateDepartures`, `UpdateArrivals`, `UpdateDirection` — обновление справочников пунктов
- `PingAPI` — health-check внешних API
- `DropSessions` — очистка зависших сессий бронирования во внешнем API
- `SendTickets`, `SendEmails` — рассылка билетов и писем
- `ManualReturn`, `ManualReturnForced`, `ReturnAll` — ручные возвраты
- `CBRFCurrensyRateDaili` — курсы ЦБ РФ
- `ImportDataBGES` / `ExportDataBGES` — обмен CSV по FTP (наследие ЖКХ, пакеты `barnaul/imports`, `barnaul/export`)
- `UnittailerPaimentCheckerProcess`, `ConvertSalesOportunity` — сторонние сценарии

## 2.8. Модуль `ru.siberium.personalaccount` — дубликат

Отдельный web-бандл с контекстом `SIBInterface`, адрес JAX-RS `/barnaul`. Пакет `ru.siberium.barnaul.*` содержит **посимвольные копии** классов из `donbilet.webservices`: `AuthenticateProcessor`, `AuthorizationRequestProvider`, `JSONValidatorProvider`, `CorseRestful`, а также `Departures`, `Arrivals`, `Details`, `Search`, `StartResource`, `MainResource`, `LKResource`, `ReserveResource`, `OrdersResource`, `TicketResource`.

Сверх того у него есть собственная предметная область — ЖКХ-личный кабинет: `PersonalAccountResource` (лицевые счета), `MeterReadingResource` / `ValueMeterReadingResource` / `MeteringDevicesResource` (приборы учёта и показания), `DebtsResourse` (задолженность), `VidUslugResourse` (виды услуг), `AbonentRequestsRestful` / `AbonentQuestionsRestful` (обращения), `LinkPersonalAccountRestful`, `RegistrateRestful`, `FileResource`.

Это исторический предок билетного API: DonBilet сделан копированием проекта ЖКХ и заменой домена. Обе копии живут параллельно и расходятся — 19 105 строк дублирующего кода. Следы в billing-модуле остались и в основном: `PersonalAccountResource`, `MeteringDevicesResource`, `ValueMeterReadingResource` физически лежат в `donbilet.webservices`, хотя к билетам отношения не имеют (и не зарегистрированы в контексте).

## 2.9. Логирование

Класс `ru.siberium.utils.LogService` пишет в один файл `$ADEMPIERE_HOME/log/ServicesExchange.log` через статический `Writer`, открытый в конструкторе. Каждый `new LogService()` переоткрывает статический поток — при параллельных запросах это гонка и потеря записей.

Параллельно повсеместно используется `System.out.println()` с выводом полезной нагрузки: токенов, ID пользователей, тел запросов к платёжным шлюзам. Структурированного логирования, корреляционных ID и уровней нет.
