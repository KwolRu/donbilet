# 04. Архитектура frontend

## 4.1. Тип приложения

Angular 8.2 SPA с серверным рендерингом (Angular Universal). Собирается в два бандла:

- `dist/browser` — клиентское приложение и статика;
- `dist/server` — фабрика `AppServerModuleNgFactory`, которую подключает `server.ts`.

Запуск в продакшене: `node dist/server` под pm2 (см. `Makefile: build-test`), порт по умолчанию 4000.

## 4.2. Структура `src/app`

```
app/
├── app.module.ts            корневой модуль: интерцепторы, CookieModule, Material, Метрика
├── app.server.module.ts     серверный модуль (ServerTransferStateModule)
├── app-routing.module.ts    28 маршрутов, все — lazy loaded
├── core/
│   ├── services/api/        17 API-сервисов (наследники ApiService)
│   ├── services/            guard-auth.service.ts, purchase-store.service.ts
│   ├── interceptors/        token.interceptor.ts, tranfer-state.interceptor.ts
│   ├── models/              ~30 интерфейсов/моделей ответов API
│   ├── directives/          baggage, date-picker, faq-accordion, scroll-to-top
│   ├── pipes/               decline (склонение), form-array-controls, sanitize-html
│   └── data/directions.ts   статический справочник направлений
├── pages/                   26 страничных модулей
├── ui/modules/              36 переиспользуемых UI-модулей
├── ui/banners-modules/      bullets, qr-banner, slider
├── static-pages/insurance/  отдельная статическая страница
├── services/meta.service.ts SEO-мета + og-теги (SSR-aware)
└── shared/types/
```

Конвенция из `README.md` проекта: **один компонент = один NgModule**. Отсюда 128 модулей на 100 компонентов. Каждый UI-элемент (`count-button`, `gender`, `preloader`, `tab`) обёрнут в собственный `NgModule` с секцией `exports`.

## 4.3. Маршрутизация

Все маршруты в `app-routing.module.ts` используют `loadChildren` с динамическим `import()` — полный lazy loading, общий `RouterModule.forRoot(routes, { scrollPositionRestoration: 'top' })`.

| Маршрут | Модуль | Назначение |
|---|---|---|
| `''` | `MainModule` | Главная с формой поиска |
| `races` | `RacesModule` | Результаты поиска рейсов |
| `raspisanie` / `raspisanie/:slug` | `SchedulePageModule` / `DirectionPageModule` | SEO-страницы расписаний и направлений |
| `booking` | `BookingModule` | Оформление: пассажиры, документы, багаж (551 строка в компоненте) |
| `seat` | `SeatSelectionModule` | Выбор мест по схеме салона |
| `personal-information` | `PersonalInformationModule` | Данные покупателя |
| `ticket-reservation` | `TicketReservationModule` | Бронь без оплаты |
| `reservation-confirm` | `ReservationConfirmModule` | Подтверждение брони |
| `thank`, `result` | `ThankModule` | Возврат с платёжного шлюза (оба пути на один модуль) |
| `profile` | `ProfileModule` | ЛК: `main`, `edit`, `sign-in`, `sign-up`, `password-recovery`, `ticket-return`, `rate`, `rate-thank`, `profile-popup` |
| `b2b`, `hotels`, `poezda`, `personal` | соответствующие модули | Партнёрские и смежные продукты |
| `faq`, `about-us`, `contacts`, `news`, `feedback`, `partner-form` | | Контентные страницы |
| `public-offer`, `privacy-policy`, `insurance` | | Юридические страницы |
| `rostov_moskva`, `krim` | `StaticPagesModule` | Захардкоженные SEO-лендинги |
| `**` | `Error404Module` | 404 |

Маршруты `personal` и `poezda` импортируют классы под именем `PublicOfferModule` — модули переименовали копипастой, не поправив идентификатор. Работает, но вводит в заблуждение.

## 4.4. Слой доступа к API

Базовый класс:

```ts
@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(protected http: HttpClient) {}
  protected getApiUrl(action: string): string {
    return environment.apiEndpoint + action;
  }
}
```

От него наследуются 17 сервисов в `core/services/api/`:

| Сервис | Эндпоинты |
|---|---|
| `AuthService` | `/authenticate/login`, `/authenticate/resetpassword`, `/main/register` |
| `RacesService` | `/search`, `/details` |
| `DeparturesService`, `ArrivalsService`, `CitiesService` | `/departures`, `/arrivals`, `/main/cities` |
| `PurchaseService` | `/start/ticket`, `/start/reserve`, `/reserve/*`, `/return-insurance` |
| `LkService` | 12 методов `/lk/*` |
| `LpDataService`, `PopularCitiesService`, `GetTilesService` | контент главной |
| `DictionaryService` | `/reserve/ctzn`, `/reserve/doctype` |
| `ContactService`, `SubscribeService` | `/main/sendrequest`, `/main/subscribe` |
| `InsuranceService` | `/lk/startreturninsurance`, `/lk/returninsurancecode` |
| `BusService` | вспомогательный |

Типизация частичная: часть методов возвращает `Observable<Model>`, часть — `Observable<any>` с комментарием `// TODO: прописать типы`. Разбор ответов делается прямо в сервисе через `map(_ => _[0])` — компенсация массивного формата ответа API.

## 4.5. Интерцепторы

### `TokenInterceptor`

Один интерцептор совмещает три обязанности:

1. **Подстановка учётных данных**: добавляет `apikey`/`apitoken` из `environment` в query каждого запроса и заголовок `X-Crfs-token` из cookie `token`.
2. **Глобальная обработка ошибок**: 401/403 → удаление cookie и переход на главную; 423, 408, 422 → открытие `MatDialog` с текстом `err.error.error` и последующим редиректом на `/races` или `/booking` с восстановлением query-параметров.
3. **Навигация**: конструирует URL с 15 query-параметрами, часть значений берёт из `sessionStorage`.

В коде оставлен комментарий автора: `// TODO: эту кучу говна надо переделать по правильному`. Интерцептор — узкое место: любое изменение обработки ошибок затрагивает всю навигацию покупки.

### `TransferStateInterceptor`

Классический паттерн Universal: на сервере результаты HTTP кладутся в `TransferState` по ключу URL, на клиенте — извлекаются, чтобы не повторять запрос при гидратации. Реализация корректная, но ключом служит только `req.url` без учёта метода и заголовков — POST-ответы теоретически могут переиспользоваться.

## 4.6. Управление состоянием

Готовой библиотеки состояния (NgRx/Akita) нет. Используется комбинация:

- `BehaviorSubject` внутри singleton-сервисов (`PurchaseService.orderData`, `GuardAuthService.dataSource`);
- **cookies** как основное хранилище: `token`, `email`, объект `purchase:start` (`PurchaseStoreService` пишет весь заказ в cookie через `cookieService.putObject`);
- `sessionStorage` — `docId`, `uuid` и прочее, читается напрямую из интерцептора и компонентов;
- query-параметры маршрута — фактический носитель состояния воронки покупки (`departure`, `arrival`, `date`, `person`, `raceId`, `orderId`, `scheduleId`, `isBaggage`, `isDetails`, `isFree`, `isEdit`, `uuid`, `type`, `selected`).

Итог: одно и то же состояние продублировано в четырёх местах, а воронка покупки восстанавливается из URL. Это причина сложности `TokenInterceptor`.

Защита маршрутов — `GuardAuthService implements CanActivate`, проверяющий лишь наличие cookie `token`; при отсутствии редиректит на `/profile/password-recovery` (спорный выбор — ожидался бы экран входа).

## 4.7. SSR

`server.ts` (~160 строк) делает следующее:

1. Создаёт DOM через **domino** из собранного `index.html` и вручную выкладывает в `global` около 50 объектов: `window`, `document`, `navigator`, все `HTML*Element`, `Event`, `MutationObserver`, `getComputedStyle`, `requestAnimationFrame`, мок `transform` и т. д.
2. Регистрирует `ngExpressEngine` с `provideModuleMap(LAZY_MODULE_MAP)`.
3. Раздаёт статику из `dist/browser` с агрессивным кешированием (JS/CSS/шрифты — `max-age=31536000, immutable`, картинки — 30 дней).
4. **Отключает SSR для части маршрутов** — отдаёт голый `index.html`:

```ts
const NO_SSR_ROUTES = ['/booking', '/ticket-reservation', '/personal-information',
                       '/profile', '/seat', '/b2b'];
```

Комментарий в коде: `// <-- Добавили B2B без SSR (на случай если SSR падает)`.

5. Все остальные пути рендерит через Universal.

Объём ручного полифилла глобалей и список исключений — прямое следствие того, что компоненты обращаются к браузерным API без проверки платформы. Пример: `AppComponent.ngOnInit()` вызывает `console.log(window.location.href)` без `isPlatformBrowser`. Файлы `static.paths.ts` (`/faq`, `/contacts`, `/about`) и `server.routes.ts` (`main`) остались от отброшенного подхода с пререндерингом и в `server.ts` не используются.

## 4.8. Стили

`src/scss/` — глобальные партиалы: `_variables`, `_functions`, `_helpers`, `_utils`, `_fonts`, плюс покомпонентные `_btn`, `_inputs`, `_header`, `_footer`, `_title`, `_tooltip`, `_date-picker`, `_dialog-windows`, `_dropdownArrow`, `_payform`. Точка входа — `styles.scss`; рядом лежит немодульный `stylesheet.css`.

Дополнительно есть модуль `ui/modules/inline-styles` с компонентом `InlineStylesComponent`, который загружается вторым в `bootstrap: [AppComponent, InlineStylesComponent]` — приём для инлайна критического CSS при SSR.

Проверка стилей — `.stylelintrc.json`, форматирование — `.prettierrc`, линт TS — TSLint 5.11 + codelyzer (оба сняты с поддержки).

## 4.9. Конфигурация окружений

Три файла в `src/environments/`:

| Файл | `apiEndpoint` | `paylerLInk` | Метрика |
|---|---|---|---|
| `environment.ts` (dev) | `https://donbilet.ru/WSv2` | sandbox | 70848625 |
| `environment.prod.ts` | `https://donbilet.ru/WSv2` | `https://secure.payler.com/gapi/Pay` | 16850443 |
| `environment.testEnv.ts` | `http://localhost:8080/DBInterface/services/donbilet/V2` | sandbox | 16850443 |

Во всех трёх файлах в открытом виде лежат `apiKey: 'dbv2'` и `apiToken: 'DE1CA22B854CF19195D82F526D53BAD6'`. Дев-конфигурация по умолчанию смотрит на **боевой** API. Опечатка `paylerLInk` растиражирована по всем файлам.

## 4.10. Тестирование

- 84 файла `*.spec.ts` — автоматически сгенерированные CLI заглушки вида «should create», содержательных проверок нет.
- `e2e/` — конфигурация Protractor (снят с поддержки с 2022).
- `httpTests/*.http` — ручные HTTP-сценарии, фактически единственная живая документация API.
- CI-конфигурации в репозитории нет.

## 4.11. Артефакты, не относящиеся к исходникам

В корне фронтенда лежат `build-client.log`, `server.log`, `local_packages.txt`, каталог `backup/` со старыми `angular.json` и `package.json`, а также `yarn.lock` **и** `package-lock.json` одновременно (два менеджера пакетов, README требует yarn, `Makefile` — npm).
