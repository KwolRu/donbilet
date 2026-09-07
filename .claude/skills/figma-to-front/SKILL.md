---
name: figma-to-front
description: >-
  Превращает вёрстку из плагина figma-to-code (JSX/HTML с арбитрарными
  Tailwind-классами) в production-фронт проекта: Next.js 16 App Router, React 19,
  Tailwind v4, Zustand, zod. Переиспользует компоненты frontend/components/ui и
  frontend/components/common, маппит стили на токены global.css, строит дата-слой
  api → store → validators. Использовать, когда пользователь присылает
  сгенерированную из Figma вёрстку/разметку/макет и просит реализовать страницу,
  секцию или компонент.
when_to_use: >-
  Триггеры: «вот вёрстка из фигмы», «сверстай/реализуй этот макет/экран»,
  «figma-to-code», вставленный JSX с хардкод-цветами и inline-стилями.
  Не использовать для чисто backend-задач — там /feature-pattern.
argument-hint: "[вёрстка или путь к файлу] [что реализовать и как работает]"
---

# figma-to-code → фронт проекта

Сырая разметка из Figma → чистая фича по конвенциям репозитория. По умолчанию
делается **полная фича**: UI + дата-слой + состояния loading/error/empty, если
поведение описано. Full-stack-паттерн (backend, Prisma, tenancy) — `/feature-pattern`.

## Сопутствующие скиллы

Загрузить через Skill tool перед реализацией:

- `vercel-react-best-practices` — Server/Client-компоненты, data fetching, бандл.
- `vercel-composition-patterns` — при вынесении переиспользуемого UI.
- `web-design-guidelines` — финальный чек a11y и адаптивности.
- `vercel-react-view-transitions` — **только** если по описанию нужны анимации переходов.

## Входные данные

Нужны три вещи: **вёрстка**, **куда** положить (route-группа и место на странице),
**как работает** (данные, интерактив, состояния, сабмиты, валидация).
Если чего-то не хватает — задать вопросы через AskUserQuestion **до** написания
кода, не додумывать молча.

## Workflow

Скопировать чеклист в ответ и отмечать по ходу:

```
- [ ] 1. Вопросы и план (если есть неясности — сначала они)
- [ ] 2. Инвентаризация вёрстки
- [ ] 3. Маппинг на существующие компоненты
- [ ] 4. Согласование уникальных компонентов
- [ ] 5. Стили → токены global.css
- [ ] 6. Дата-слой api → store → validators
- [ ] 7. Server/Client-разделение
- [ ] 8. Размещение, lint, build
```

**Шаг 1 — Вопросы и план.** Разобрать вёрстку, задать уточняющие вопросы (в формате
выбора при развилках), показать короткий план. Код не писать, пока не ясны: место
размещения, поведение/данные, судьба уникальных компонентов, недостающие токены.

**Шаг 2 — Инвентаризация.** Разложить разметку на элементы: контейнеры, кнопки,
поля, списки, бейджи, модалки, табы, аватары и т.д.

**Шаг 3 — Маппинг на компоненты.** Каждый элемент сопоставить с готовым.
Две библиотеки:

```!
ls frontend/components/ui
```

```!
ls frontend/components/common
```

- `components/ui/` — базовые примитивы (кнопки, поля, селекты, чекбоксы,
  календарь, drawer, тосты).
- `components/common/` — составные блоки: `entity-table`, `entity-list-toolbar`,
  `search-input`, `filter-*`, `table-settings-drawer`, `page-heading`,
  `page-surface`, `profile-page-layout`, `empty-state`.

Правило: **не копировать разметку из Figma, если компонент уже есть**; не хватает
варианта/размера — расширить через props, а не создавать дубль. Списки с
фильтрами и настройками колонок собираются из `common/`, а не верстаются заново.

**Шаг 4 — Уникальные компоненты.** Элемента нет ни в `ui`, ни в `common` →
остановиться и спросить: (а) вынести переиспользуемым в `components/ui/<name>.tsx`
или `components/common/<name>.tsx`, или (б) оставить локальным
`<route>/components/<name>.tsx`. Не решать молча.

**Шаг 5 — Стили → токены.** Source of truth — блок `@theme` в
`frontend/assets/styles/global.css`: прочитать его перед маппингом, не полагаться
на память. Схема маппинга: `--color-primary` → `bg-primary` / `text-primary` /
`border-primary`; `--color-text-secondary` → `text-text-secondary`;
`--breakpoint-tablet` → вариант `tablet:`. Хардкод и арбитрарные значения из
плагина заменять на токены. Точного токена нет → остановиться и согласовать
добавление в `global.css`, не выдумывать значение.

**Шаг 6 — Дата-слой** (когда поведение описано):

- API-клиент — `frontend/app/core/api/<resource>.ts` поверх `apiClient`.
  Заголовки тенанта не нужны: workspace резолвится из JWT на бэкенде.
- Store — `frontend/app/core/store/<resource>.ts` (Zustand): единственное место
  вызова api, владеет loading/error. Эталон — `store/notifications.ts`.
- Валидаторы — `frontend/app/core/validators/<resource>.ts` (zod).
- Состояния UI: loading — `ui/skeleton`, error — `ui/error-banner` / `ui/form-error`,
  empty — `common/empty-state` или `ui/empty-block`.
- Разовые уведомления — `notify.success(...)` / `notify.error(...)` из
  `store/notifications`, не свои тосты.

Поток строго **page/component → store → api**; страницы api-клиенты не вызывают.

**Шаг 7 — Server/Client.** По умолчанию Server Component; `"use client"` — только
на интерактивных листьях, не на всей странице. Серверная загрузка данных отдельно
от клиентской интерактивности; страница тонкая, логика — в store/хуках.

**Шаг 8 — Размещение и проверка.** Защищённые страницы — под `/app` (гейт по
cookie в `proxy.ts`); публичные пути перечисляются в `lib/routing/auth-paths.ts`.
Новый раздел → подпись в `app/core/configs/routes.ts` (крошки и страница ошибки).
Route-локальные `components/`, `hooks/`, `utils/` — только если специфичны для
маршрута. Финальный чек по `web-design-guidelines`, затем `npm run lint` и
`npm run build` из `frontend/` — оба зелёные.

## Пример маппинга

Вход (figma-to-code):

```jsx
<div className="flex h-10 items-center rounded-lg bg-[#4F46E5] px-4 text-[14px] text-white"
     style={{ fontWeight: 600 }}>
  Сохранить
</div>
```

Выход:

```tsx
<Button variant="primary" size="md">Сохранить</Button>
```

Хардкод `#4F46E5` не переносится — у существующего `Button` цвет уже из токена.

## Anti-patterns

- Копировать сырую разметку вместо переиспользования компонентов.
- Верстать таблицу со списком заново вместо `common/entity-table`.
- Хардкодить цвета/размеры/`style={{...}}` вместо токенов и Tailwind-утилит.
- Молча создавать переиспользуемый компонент или новый токен без согласования.
- Вызывать api напрямую из страниц/компонентов в обход store.
- `"use client"` на всю страницу ради одного интерактивного элемента.
- Пропускать loading/error/empty-состояния при наличии дата-слоя.
- Добавлять зависимость ради одного эффекта — сначала проверить, что уже есть
  в `package.json`.
