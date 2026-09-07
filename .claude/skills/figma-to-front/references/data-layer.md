# Дата-слой: validators → api → store

Три файла на ресурс, всегда в этом порядке. Разрыв цепочки — самая частая причина
расхождения фронта с контрактом бэкенда.

## 1. Validators (`app/core/validators/<ресурс>.ts`)

Источник правды о форме данных **и** о доменных константах.

```ts
import { z } from "zod";

export const KNOWLEDGE_SECTIONS = [
  "facts", "services", "not_services", "pricing",
  "timelines", "portfolio", "terms", "prohibitions",
] as const;
export type KnowledgeSectionKey = (typeof KNOWLEDGE_SECTIONS)[number];

export const knowledgeSectionSchema = z.object({
  section: z.string(),
  content: z.string(),
  version: z.number(),
  updatedAt: z.string(),
});
export type KnowledgeSectionRow = z.infer<typeof knowledgeSectionSchema>;

export const knowledgeListSchema = z.object({
  sections: z.array(knowledgeSectionSchema),
});
export type KnowledgeList = z.infer<typeof knowledgeListSchema>;
```

Правила:

- Типы — **производные** от схем через `z.infer`, а не написанные отдельно. Иначе тип и
  проверка расходятся, и TypeScript начинает врать.
- Даты как `z.string()`, преобразование — в месте отображения. `z.coerce.date()` ломает
  сериализацию в стор и сравнение в тестах.
- Списки допустимых значений (`as const`) живут здесь и переиспользуются стором и UI.
- Схема описывает **фактический** ответ сервера, а не желаемый. Если сервер отдаёт лишнее —
  zod по умолчанию отбросит; если не отдаёт обязательное — упадёт, и это правильно.

## 2. API-клиент (`app/core/api/<ресурс>.ts`)

Тонкая функция на эндпоинт. Не знает про React, не знает про стор.

```ts
import { knowledgeListSchema, type KnowledgeList } from "../validators/knowledge";

async function readError(res: Response): Promise<never> {
  if (res.status === 401) throw new Error("Сессия истекла — войдите заново");
  const body = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
  throw new Error(body.message || body.error || `Ошибка ${res.status}`);
}

export async function getKnowledge(): Promise<KnowledgeList> {
  const res = await fetch("/api/crm/knowledge", {
    credentials: "same-origin",
    cache: "no-store",
  });
  if (!res.ok) return readError(res);
  return knowledgeListSchema.parse(await res.json());
}
```

Обязательное:

| Что | Почему |
|---|---|
| `credentials: "same-origin"` | без него cookie сессии не уйдёт → 401 «на ровном месте» |
| `cache: "no-store"` для данных | иначе Next закэширует ответ и экран «залипнет» |
| `schema.parse(...)` | приведение типом (`as`) не проверяет ничего |
| единый `readError` | коды ошибок — контракт, обрабатывать их в одном месте |

Коды, которые фронт обязан различать:

| Код | Реакция |
|---|---|
| 401 | увести на вход, не ретраить |
| 402 | показать «лимит AI исчерпан» с цифрами из тела, не ретраить |
| 403 | «недостаточно прав» / «действие запрещено политикой» + причина из тела |
| 404 | пустое состояние, а не ошибка |
| 409 | перечитать и предложить повтор |
| 502 | «сервис временно недоступен», ретрай уместен |

Свалить всё в «Ошибка 500» — значит лишить пользователя понимания, что делать.

## 3. Стор (`app/core/store/<ресурс>.ts`)

Zustand. Нужен, когда состояние переживает навигацию или разделяется компонентами.
Разовая выборка на одной странице может обойтись без стора.

```ts
export const useKnowledgeStore = create<KnowledgeState>((set, get) => ({
  sections: emptySections(),
  loading: true,
  error: null,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const data = await getKnowledge();
      set({ sections: merge(emptySections(), data.sections), loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },
}));
```

Правила:

- **Три состояния минимум**: загрузка, ошибка, данные. Плюс «пусто» отдельно от «загрузка» —
  иначе пустой список выглядит как вечный спиннер.
- Хранить и **сохранённое** значение рядом с редактируемым (`content` / `savedContent`),
  если есть форма: без этого нельзя честно показать «есть несохранённые изменения».
- Стор не рендерит и не знает про компоненты; api-клиент не знает про стор — зависимость
  односторонняя.
- Оптимистичное обновление — только с откатом при ошибке. Без отката UI начинает врать.

## Отмена и гонки

Быстрая смена фильтров даёт гонку: ответ на старый запрос приходит после нового.

```ts
let seq = 0;
load: async (filters) => {
  const my = ++seq;
  const data = await getLeads(filters);
  if (my !== seq) return;          // пришёл устаревший ответ — игнорируем
  set({ items: data.items });
}
```

Либо `AbortController` с отменой предыдущего запроса. Без одного из двух список периодически
показывает результат прошлого фильтра.

## Пагинация

Курсорная (`cursor` + `limit`), а не `offset`: на растущих данных offset даёт пропуски и
дубли. Клиент передаёт полученный курсор обратно, не вычисляет его сам.

## Что НЕ делать

- **Импортировать `app/core/api/client.ts`** — это легаси-axios S-CRM с логикой
В шаблоне тенант резолвится из JWT: заголовков со slug и поддоменов нет.
- **Ходить напрямую на gateway** (`http://localhost:5000`) — в проде нет такого адреса и
  нет токена.
- **Передавать `workspaceId`** — тенант в сессии.
- **`as` вместо `parse`** — контракт перестаёт проверяться ровно тогда, когда бэкенд его
  меняет.
- **Логика в компоненте** («сначала загрузим, потом отфильтруем, потом посчитаем») —
  это работа стора или чистой функции, которую можно протестировать `node --test`.
