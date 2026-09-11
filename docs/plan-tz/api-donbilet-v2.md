# API DonBilet V2 — фактический контракт

Источник: `01_СТАРЫЙ_ПРОЕКТ/DonBilet V2.postman_collection.json` (385 КБ, 20 запросов
с примерами ответов). Это документация действующего API, к которому подключается
новый фронт. **Backend не переписывается** — см. `roadmap.md`.

| | |
|---|---|
| Base URL в коллекции | `http://80.254.115.166:28080/DBInterface/services/donbilet/V2` |
| Прод (из legacy-фронта) | `https://donbilet.ru/WSv2` |
| Тестовые ключи | `apikey=testapi`, `apitoken=DE1CA22B854CF19195D82F526D53BAD6` |
| Статус стенда из коллекции | **не отвечает** (проверено 07.09.2026, таймаут 15 с) |

## Авторизация

Два независимых механизма, оба обязательны.

1. **Ключ приложения** — `apikey` и `apitoken` в query каждого запроса.
2. **Сессия** — заголовок `X-Crfs-token`, выдаётся при `/authenticate/login`.

> Ключи приложения **не должны попадать в браузер**. В legacy-фронте они лежали
> в `environment.ts` открытым текстом. В новой архитектуре их держит gateway и
> подставляет на серверной стороне.

## Общие свойства ответов

- Большинство коллекций обёрнуты в массив из одного элемента: `[{...}]`.
- Деньги — числа с плавающей точкой (`873.12`), не копейки.
- Даты — смешанный формат: `"11.11.2020"` (поиск), ISO с офсетом
  `"2020-11-13T19:30:00+03:00"` (билеты), unix-мс (`687045600000` в `bDay`).
- Есть опечатки в именах полей, которые надо сохранять при вызовах:
  `passangers`, `pasTicketnum` / `pasTicketNum` (оба варианта в одном ответе),
  `bagTicketnum` / `bagTicketNum`.
- Ошибка: `403 {"error":"Сессия устарела или не найдена"}`.

---

## Публичные справочники и поиск

### `GET /departures`
Города отправления. Ответ ~130 КБ.

### `GET /arrivals?departure={cityID}`
Города прибытия для выбранного отправления. Ответ ~26 КБ.

### `GET /main/popularcities`
```json
[{ "cities": [{ "cityName": "Ростов-на-Дону", "cityID": 1160663 }] }]
```

### `GET /main/gettiles?departure={cityID}&date=DD.MM.YYYY`
Плитки популярных направлений с ценами.

### `GET /search?departure={cityID}&arrival={cityID}&date=DD.MM.YYYY`

```json
[{ "races": [{
  "scheduleID": 2467886,          // ← идентификатор для /start/ticket
  "raceID": 1001358,
  "raceName": "Воронеж - Москва",
  "raceNum": "",
  "depCity": "Воронеж",  "arrCity": "Москва",
  "depDate": "11.11.2020", "depTime": "21:30",
  "arrDate": "12.11.2020", "arrTime": "05:20",
  "tripTime": "7:50",  "sortTime": 7.5,  "sortDepTime": 213000,
  "stationDepID": 1000955, "stationDepName": "...", "stationDepAddr": "...",
  "stationArrID": 1000748, "stationArrName": "...", "stationArrAddr": "...",
  "cost": "873.12",               // строка, не число
  "baggageCost": "-1.07",         // отрицательное = багаж недоступен
  "places": "1",                  // строка
  "placesColor": "#00FF00",       // цвет для UI приходит с backend
  "carrier": "Нет данных",
  "canBuyBaggage": false, "isPrintTicket": true,
  "isBook": "N", "isDetails": "N" // строковые булевы
}}]
```

Замечания, влияющие на фронт:
- `cost`, `places`, `baggageCost` — строки; приводить на границе;
- `isBook` / `isDetails` — `"Y"`/`"N"`, не булевы;
- `placesColor` приходит с backend — цвет в API вместо дизайн-токена, в новом
  фронте маппится на палитру макета, а не подставляется напрямую;
- `carrier: "Нет данных"` — валидное значение, не ошибка.

### `GET /details?routeid={raceID}`
Детали маршрута. **Примеров ответа в коллекции нет** — контракт неизвестен.

---

## Воронка покупки

Последовательность обязательна, каждый шаг зависит от предыдущего.

### 1. `GET /start/ticket?scheduleid={scheduleID}&person={N}`
```json
[{ "orderid": 1082103, "uuid": "a4a95bf8-...", "free": 1, "isFreePlaces": "Y" }]
```
`uuid` и `orderid` — ключи всей дальнейшей сессии покупки.

### 2. `GET /reserve/ctzn`
Справочник гражданств, ~31 КБ.

### 3. `POST /reserve/addpass?uuid={uuid}`

```json
{
  "sessionID": "start", "orderID": 1082101,
  "email": "...", "phone": "+79189998877", "coupon": null,
  "passangers": [{
    "passangerID": "1",
    "fName": "Петр", "lName": "Иванов", "sName": "Сидорович",
    "bDay": "10.10.2009", "sex": "m",
    "citizenshipISO": 643, "citizenshipName": "Россия",
    "docTypeID": "1000006", "docType": "Свидетельство о рождении РФ",
    "docNum": "II-АН 123098",
    "baggage": 0,
    "placeNum": "FS", "placeID": "FS", "place": "FS"   // FS = free seating
  }],
  "isSubscribe": false, "isSaveLogin": false,
  "isConfirmPolicy": true, "isConfirmPersonalData": true
}
```

Ответ содержит рассчитанную цену: `total`, по пассажирам — `tarif`, `agent`,
`discount`, `baggagePrice`, а также результат применения купона строкой:
`"coupon": "Купон не может быть применен"`.

**Здесь считается итоговая сумма заказа.** Это ключевой факт для ТЗ 2.11, 2.22, 2.23.

### 4. `GET /reserve/getpass?uuid={uuid}&orderid={orderID}&isedit=Y`
Состав заказа для экрана редактирования.

### 5. `GET /reserve/buy?orderid={orderID}`
```json
[{ "orderID": 1082112, "orderName": "5pMNCYWL",
   "merchantOrderID": "FiAeqfRV4Udqy9Hs_1082112",
   "merchantSessionID": "IKat2ZEXfRjC97vYhOzjh9BzrtVU0iIB8BRe",
   "merchantURL": "https://sandbox.payler.com/gapi/Pay",
   "total": 873.12, "sessionID": "10181713" }]
```
**Платёж инициирует backend DonBilet.** Фронт только уводит пользователя на
`merchantURL` с `merchantSessionID`. Сумма берётся из заказа, сформированного
на шаге 3.

### 6. `GET /reserve/result?orderid={merchantOrderID}`
Итог оплаты с полным составом заказа и пассажирами. В legacy этот вызов
удерживает соединение до 40 с поллингом — на новом фронте нужен таймаут и
индикация ожидания.

### 7. `GET /main/getticket?ticketid={id}&uuid={uuid}`
PDF билета.

---

## Пользователь и личный кабинет

### `POST /main/register`
`{ "email", "phone", "password" }` → `{ "userID": 1011178 }`

### `POST /authenticate/login`
`{ "loginName": "email", "credData": "pass" }` →
```json
{ "statusCode": "ACCEPTED", "token": "18880bd5-...", "userID": 1000044, "message": null }
```
`token` далее передаётся в заголовке `X-Crfs-token`.

### `GET /lk/userinfo`
`{ "phone": "9185587761", "email": "vladislav@siberium.ru" }`

### `POST /lk/edit`
`{ "password", "phone" }` → `{ "OK": "OK" }`

### `GET /lk/mytickets` и `GET /lk/myhistory`
Массив билетов. Поля: `ticketID`, `uuid`, `orderName`, `orderType`, `orderDateTime`,
`raceName`, `raceNum`, `depCity`/`arrCity`, `depStation`/`arrStation`, `platform`,
`arrDateTime`, `place`, ФИО (`fName`/`lName`/`sName`), `bDay`, `sex`,
`docTypeName`/`docNum`, `citizenshipName`, `category`/`categoryName`,
`pasTarif`/`bagTarif`/`agentTarif`/`totalTarif`, `discount`, `isRefundable`, `email`.

`myhistory` — 46 КБ в примере, пагинации нет.

### `GET /lk/messages`
```json
[{ "header": "Тестовое сообщение", "text": "текст длинный" }]
```
**Ни даты, ни признака прочитанности.** ТЗ 2.3 требует и то, и другое.

### `GET /lk/startreturn?ticketid={id}`
Расчёт возврата. Примеров в коллекции нет. Подтверждение — `POST /lk/returncode`
(в коллекцию не входит, есть в коде).

---

## Покрытие ТЗ действующим API

### Закрывается полностью

2.2 История · 2.4 Профиль · 2.18 Авто (поиск и покупка) · частично 2.1 (список
билетов, PDF, старт возврата)

### Есть в коде, но нет в коллекции — контракт надо уточнить

`/main/getnews`, `/main/getbanners`, `/main/getfaq`, `/main/getland`,
`/main/subscribe`, `/main/sendrequest`, `/details`, `/lk/returncode`,
`/lk/feedback`, `/lk/delete`, `/reserve/reserve`, `/acceptcode/*`

### Не покрывается — требует нового backend на нашей стороне

2.5 Избранное · 2.6 Пассажиры · 2.9 VK/Яндекс ID · 2.12 админка новостей и RSS ·
2.13 админка FAQ · 2.14 Чат поддержки · 2.15 Бот MAX · 2.21 Кросс-переходы ·
2.24 Снижение цены · 2.25 Напоминание · 3.3 Админ-панель · 2.3 (даты и
прочитанность сообщений) · 2.8 (админка оценок и CSV)

### ⚠ Требует изменений в API DonBilet — своими силами не закрывается

| Пункт ТЗ | Почему |
|---|---|
| **2.11 Страховка** | Сумма к оплате формируется в `/reserve/addpass` и уходит в `/reserve/buy`. Добавить позицию в платёж снаружи нельзя |
| **2.22 Отель в заказе** | То же. ТЗ требует «оплата отеля в общем платеже с билетом» |
| **2.23 Промокоды** | Купон применяется в `addpass`, а ТЗ требует применение **на экране оплаты** с пересчётом. Лимитов использований в API нет |
| **2.26 Туда-обратно** | Один заказ = один рейс. Единая оплата двух сегментов и компенсация при сбое второго — логика заказа |
| **2.1 (проверка владения PDF)** | `/main/getticket` не проверяет принадлежность билета сессии |
| **2.10 (TTL кода 15 мин, лимит 60 с)** | Логика подтверждения на стороне backend |

Это ключевое ограничение объёма. Решение — вопрос Q8 в `roadmap.md`.

---

## Что нужно получить от заказчика

1. **Актуальный base URL и ключи** — стенд из коллекции не отвечает.
2. **Контракты эндпоинтов без примеров**: `/details`, `/lk/startreturn`,
   `/lk/returncode`, `/main/getticket`, контентные методы.
3. **Ответ по пунктам, требующим изменений API** (таблица выше).
4. Полномочия и контакт разработчика, сопровождающего backend DonBilet.
