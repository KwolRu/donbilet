# 03. Справочник REST API

## 3.1. Общие сведения

| Параметр | Значение |
|---|---|
| Базовый путь (внутренний) | `/DBInterface/services/donbilet/V2` |
| Базовый путь (публичный) | `https://donbilet.ru/WSv2` |
| Стенд | `http://localhost:8080/DBInterface/services/donbilet/V2` |
| Стиль | JAX-RS 1.1 (JSR-311) поверх Apache CXF 2.6 |
| Формат | JSON (`application/json`), плюс `application/pdf` и `image/jpeg` для отдельных методов |
| Версионирование | Только в пути (`V2`). Content negotiation и заголовков версии нет |
| Спецификация | Отсутствует. Нет OpenAPI/Swagger, WADL не публикуется |

### Аутентификация

Два обязательных механизма, см. [02-архитектура-backend.md §2.4](02-архитектура-backend.md).

1. **Ключ приложения** — query-параметры `apikey` и `apitoken` на каждом запросе. Проверяются по таблице `sib_frontendapi`.
2. **Сессия пользователя** — заголовок `X-Crfs-token` (UUID). Требуется для методов, помеченных ниже как «сессия». TTL — 40320 минут (28 суток).

### Коды ответов, используемые проектом

| Код | Смысл в этом API |
|---|---|
| 200 / 201 | Успех |
| 402 | Оплата по заказу не поступила |
| 403 | Неверный `apikey`/`apitoken` **или** сессия устарела/не найдена |
| 408 | Превышено время оформления билета / сессия бронирования истекла |
| 422 | Не удалось зарезервировать билеты |
| 423 | Обрабатывается фронтендом как блокирующая ошибка с редиректом на поиск |
| 520 | Обобщённая ошибка внешнего API перевозчика |

Тело ошибки: `{"error": "<текст на русском>"}`. Коды 401/404/500 приложением не формируются осмысленно. Формат ошибок не унифицирован: часть методов отдаёт JSON, часть — пустое тело.

### Формат успешного ответа

Типовой ответ — **массив из одного-двух разнородных объектов**, а не объект:

```json
[ { "races": [...], "topraces": [...] },
  { "mincost": "1250.00", "nextdate": "2022-04-18" } ]
```

Клиент обязан разбирать его по индексам (`response[0].races`, `response[1].nextdate`). Схема нигде не описана, потому что ответы строятся как `List<Map<String,Object>>`.

---

## 3.2. Зарегистрированные ресурсы

Ниже — только эндпоинты, реально подключённые в `META-INF/cxf/barnaul/rest-context.xml`.

### `/authenticate` — сессии (`AuthenticateResource`)

| Метод | Путь | Auth | Описание |
|---|---|---|---|
| POST | `/authenticate/login` | apikey | Вход. Тело валидируется схемой `login.schema`: `{loginName, credData}`. Ответ: заголовки `X-Crfs-token`, `SID` + `{status, token, userId}` |
| POST | `/authenticate/logout` | сессия | Выход. Гасит сессию в кеше и в БД (`IsActive=false`) |
| GET | `/authenticate/resetpassword?email=` | apikey | Запрос на сброс пароля |

### `/main` — контент, справочники, регистрация (`MainResource`)

| Метод | Путь | Параметры | Описание |
|---|---|---|---|
| GET | `/main/popularcities` | — | Популярные города |
| GET | `/main/gettiles` | `departure`, `date` | Плитки популярных направлений с ценами |
| GET | `/main/getland` | `route` | Данные лендинга направления |
| GET | `/main/getabout` | — | Страница «О компании» |
| GET | `/main/version` | — | Версия API |
| GET | `/main/getfaq` | `section` | FAQ по разделу |
| GET | `/main/getnews` | — | Новости |
| GET | `/main/getbanners` | — | Баннеры главной |
| GET | `/main/getimage` | `imageid` | Изображение, `image/jpeg` |
| GET | `/main/subscribe` | `email` | Подписка на рассылку |
| POST | `/main/register` | тело JSON | Регистрация пользователя |
| GET | `/main/getticket` | `ticketid`, `uuid` | **PDF билета** (`application/pdf`) |
| POST | `/main/sendrequest` | тело JSON | Обратная связь / заявка |
| GET | `/main/cities` | `dep`, `arr` | Список городов для селекторов |

### `/departures`, `/arrivals`, `/search`, `/details` — поиск рейсов

| Метод | Путь | Параметры | Описание |
|---|---|---|---|
| GET | `/departures` | — | Пункты отправления |
| GET | `/arrivals` | `departure` | Пункты прибытия для заданного отправления |
| GET | `/search` | `departure`, `arrival`, `date`, `person`, `carrier` | Поиск рейсов. Ответ: `[{topraces, races}, {mincost, nextdate}]`. Горизонт поиска ограничен 61 днём, прошедшие даты дают `error: 401` внутри тела |
| GET | `/details` | `routeid` | Детали маршрута (остановки, время) |

### `/start` — старт оформления (`StartResource`)

| Метод | Путь | Параметры | Описание |
|---|---|---|---|
| GET | `/start/ticket` | `scheduleid`, `person` | Открывает сессию бронирования у перевозчика, возвращает схему салона/места |
| GET | `/start/getplaces` | `orderid` | Занятые/свободные места по заказу |
| GET | `/start/reserve` | `scheduleid`, `person` | То же, но для сценария «бронь без оплаты» |

### `/reserve` — бронирование и оплата (`ReserveResource`)

| Метод | Путь | Auth | Параметры / тело | Описание |
|---|---|---|---|---|
| GET | `/reserve/ctzn` | apikey | — | Справочник гражданств |
| POST | `/reserve/addpass` | apikey | JSON пассажиров, `uuid` | Добавление пассажиров к заказу (покупка) |
| POST | `/reserve/addpasslog` | apikey | JSON | Вариант для авторизованного пользователя |
| POST | `/reserve/addpassreserve` | apikey | JSON | Вариант для брони |
| GET | `/reserve/getpass` | apikey | `orderid`, `uuid`, `isedit` | Получить состав заказа |
| GET | `/reserve/buy` | apikey | `orderid` | **Выкуп билетов** у перевозчика после оплаты |
| GET | `/reserve/reserve` | apikey | `orderid` | Оформление брони без оплаты |
| GET | `/reserve/result` | apikey | `orderid` | Проверка результата оплаты. **Блокирующий поллинг: до 10 итераций с `TimeUnit.SECONDS.sleep(4)` — до 40 секунд удержания потока** |
| POST | `/reserve/merchantcallback` | — | form-urlencoded, `order_id`, `orderNumber` | Callback платёжного шлюза |
| GET | `/reserve/merchantcallback` | — | `orderid`, `orderNumber` | То же через GET |
| GET | `/reserve/statusmobile` | apikey | `orderid` | Статус заказа для мобильного клиента |

### `/lk` — личный кабинет (`LKResource`, все методы требуют сессию)

| Метод | Путь | Параметры | Описание |
|---|---|---|---|
| GET | `/lk/mytickets` | — | Активные билеты |
| GET | `/lk/myhistory` | — | История поездок |
| GET | `/lk/getticketinfo` | `ticketid` | Детали билета |
| GET | `/lk/userinfo` | — | Профиль |
| POST | `/lk/edit` | JSON | Редактирование профиля |
| GET | `/lk/messages` | — | Сообщения пользователю |
| GET | `/lk/startreturn` | `ticketid` | Расчёт возврата (штраф по шкале, см. ниже) |
| POST | `/lk/returncode` | JSON | Подтверждение возврата кодом |
| POST | `/lk/delete` | JSON | Удаление записи |
| POST | `/lk/dropuser` | — | Запрос на удаление аккаунта |
| POST | `/lk/dropusercode` | `code` | Подтверждение удаления аккаунта |
| POST | `/lk/feedback` | JSON | Отзыв о поездке |
| GET | `/lk/feedbackthanks` | `id` | Страница благодарности за отзыв |

**Шкала удержания при возврате** (`DBCommon.getRefundCalc`, зашита в коде):

| Условие | Удержание |
|---|---|
| Причина возврата 3 или 6 (отмена рейса перевозчиком) | 0 % |
| Оплата была менее 10 минут назад | 0 % |
| Более 2 часов до отправления | 5 % |
| От 30 минут до 2 часов до отправления | 15 % |
| От 30 минут до отправления до +3 часов после | 25 % |
| Позже 3 часов после отправления | 100 % |

### `/orders` — заказы (`OrdersResource`)

Относится к сценарию оплаты ЖКХ-задолженности через агрегатор Unitailer (`MDebts`, `UNIT_SHOP_ID`/`UNIT_PASSWORD`/`UNIT_TTL`), а не к билетам, но зарегистрирован в билетном контексте.

| Метод | Путь | Auth | Описание |
|---|---|---|---|
| POST | `/orders/create/` | сессия | Создать заказ, вернуть `{signature, orderId, shopId}` |
| GET | `/orders/list/` | сессия | Заказы пользователя |
| POST | `/orders/accept/` | — | Callback агрегатора: form-поля `Order_ID`, `Signature`, `Status`, `BillNumber` |

### `/recovery` — восстановление пароля (`PasswordRecoveryResource`)

| Метод | Путь | Описание |
|---|---|---|
| GET | `/recovery/password/?apiname=&token=` | Проверка ссылки восстановления |
| POST | `/recovery/new/` | Установка нового пароля, тело `CreateNewPasswordRequest {token, password}` |

Единственный ресурс, не наследующий `CorseRestful` — для него не работает preflight `OPTIONS`.

---

## 3.3. Ресурсы, существующие в коде, но НЕ подключённые

Не объявлены в `rest-context.xml`, следовательно недоступны по HTTP:

`AcceptCodeRestful` (`/acceptcode/request`, `/acceptcode/confirm`), `AddressOfPersonalAccountResource` (`/location/{id}`), `CitiesResource` (`/cities/all`), `FileResource` (`/file/upload`, `/file/download/{id}`), `LocationRestful` (`/location/countries|regions|allcities|citiesupdated|streets`), `MeteringDevicesResource`, `PersonalAccountResource` (`/data/personalaccount|pa|balance|total`), `TicketResource` (`/ticket/new`), `ValueMeterReadingResource`, `TestRestful` (`/test/get`, `/test/post`).

Часть из них — ЖКХ-наследие, часть — незавершённая работа. `TestRestful` в продакшен-сборке не подключён, но его код остаётся в бандле.

---

## 3.4. Расхождения фронтенда и бэкенда

Фронтенд вызывает эндпоинты, которых **нет** в backend-коде DonBilet:

| Вызов из фронтенда | Файл | Статус на бэкенде |
|---|---|---|
| `GET /reserve/doctype` | `core/services/api/dictionary.service.ts` | Отсутствует в `ReserveResource` |
| `GET /lk/startreturninsurance?ticketid=` | `insurance.service.ts` | Отсутствует в `LKResource` |
| `GET /lk/returninsurancecode?ticketid=&code=` | `insurance.service.ts` | Отсутствует в `LKResource` |
| `POST /return-insurance` | `purchase.service.ts` | Отсутствует полностью |

Функциональность страховки на фронтенде (`core/models/insurance.model.ts`, `static-pages/insurance/`) не имеет серверной реализации в этой версии backend. Это либо мёртвый код, либо признак того, что бэкенд в репозитории старше фронтенда.

---

## 3.5. Другие HTTP-поверхности того же сервера

| Путь | Что это |
|---|---|
| `/DBInterface/services/rest` | Стандартный REST iDempiere: `ModelADServiceImpl` + `CompositeServiceImpl` — универсальный CRUD по таблицам ERP |
| `/DBInterface/services/*` (SOAP) | `META-INF/cxf/services.xml` — SOAP-сервисы iDempiere (Axis/XMLBeans), включая `ModelADService` |
| `/SIBInterface/services/barnaul/*` | Модуль `personalaccount`: ЖКХ ЛК + полная копия билетного API |

Универсальный CRUD-эндпоинт iDempiere (`/rest`) поднят на том же сервлете и защищён только собственным механизмом логина ERP — его доступность из интернета должна быть проверена отдельно.

## 3.6. Готовые примеры запросов

В репозитории фронтенда лежит коллекция `.http`-файлов (формат REST Client для VS Code), фактически заменяющая документацию:

```
httpTests/0 auth.http
httpTests/1 mainPage.http
httpTests/2 racesPage.http
httpTests/3 booking.http
httpTests/auth copy.http
```
