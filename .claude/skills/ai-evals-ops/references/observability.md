# Наблюдаемость AI-контура

Правило: **журнал выполнений — источник правды**, трассировка — способ понять «как это
происходило», внешняя LLM-обсервабилити — удобство. Терять журнал нельзя; терять спаны —
можно.

## Журнал выполнений: обязательные поля

```sql
CREATE TABLE ai_task_executions (
  id               uuid PRIMARY KEY,
  workspace_id     uuid NOT NULL,              -- tenant
  task_type        text NOT NULL,
  idempotency_key  text NOT NULL UNIQUE,       -- UNIQUE — это и есть механизм идемпотентности
  correlation_id   text,                       -- = traceId, связь со спанами
  status           text NOT NULL,              -- pending|running|completed|failed|needs_review

  model_alias      text,                       -- ЛОГИЧЕСКИЙ алиас (что просили)
  model            text,                       -- ФИЗИЧЕСКАЯ модель (кто ответил)
  provider         text,                       -- вычисляется из физической модели

  prompt_key       text,
  prompt_version   int,
  knowledge_versions jsonb,                    -- версии секций знаний + факт усечения

  prompt_tokens      int,
  completion_tokens  int,
  cost_usd           numeric(12,6),
  latency_ms         int,
  attempts           int,

  guardrails_passed  boolean,
  stored_result      jsonb,                    -- нужен для идемпотентного ответа
  created_at         timestamptz DEFAULT now(),
  updated_at         timestamptz
);

CREATE INDEX ON ai_task_executions (workspace_id, created_at DESC);
CREATE INDEX ON ai_task_executions (workspace_id, status, created_at DESC);
CREATE INDEX ON ai_task_executions (task_type, created_at DESC);
```

### Почему `model_alias` и `model` — два разных поля

Алиас = *что просили*. Физическая модель = *кто реально ответил*. После срабатывания
fallback они расходятся, и именно расхождение — самая ценная информация в журнале.

Если писать в `model` алиас (частая ошибка), то невозможно: доказать смену провайдера,
отнести стоимость к upstream, связать регресс качества с конкретной моделью. Обнаруживается
это ровно в момент, когда нужен разбор инцидента — то есть поздно.

### Откуда берутся физическая модель и стоимость

Из **заголовков** ответа шлюза (`x-litellm-model-name`, `x-litellm-response-cost`), а не из
тела: тело содержит алиас. Перехват — в кастомном `fetch` провайдера, результат — в
`AsyncLocalStorage`, не в переменную модуля (иначе параллельные вызовы перепутают
атрибуцию — см. `ai-layer-architecture/references/antipatterns.md` №7).

Стоимость от шлюза приоритетнее собственного расчёта по токенам: она авторитетна,
учитывает fallback и не зависит от формы ответа провайдера. Собственная таблица цен
устаревает молча.

### Запись в обеих ветках

`recordExecution` вызывается дважды: `running` до вызова модели и финальный статус после —
**включая `catch`**. Без записи провалов success rate считается по выжившим, а метрика
латентности показывает только успешные быстрые вызовы.

## Трассировка

Спаны вокруг: резолва конфигурации, сбора контекста, сборки знаний, вызова модели,
записи журнала.

```ts
await withSpan('ai.task.first_message', fn, {
  'ai.use_case': useCase,
  'ai.workspace_id': workspaceId,   // id, НЕ имя
  'ai.model_alias': modelAlias,
  'ai.prompt_version': promptVersion,
});
```

**Что НЕЛЬЗЯ класть в атрибуты спанов и логи:** тексты промптов, вход пользователя,
результат генерации, персональные данные, значения секретов. Спаны уезжают во внешние
системы и хранятся дольше, чем кто-либо помнит.

Инициализация трассировки — **best-effort**: сбой SDK не должен ронять сервис. Даже без
экспортёра провайдер поднимается ради валидных `traceId` для корреляции.

## Корреляция

```
correlationId (= traceId) ──┬── ai_task_executions.correlation_id
                            ├── спаны OTel
                            ├── запись внешней LLM-обсервабилити
                            └── лог оркестратора / workflow id
```

Один идентификатор проходит через все системы. Если `correlationId` не пришёл — берём
`traceId` активного спана; если и его нет — генерируем и возвращаем наружу.

Без сквозной корреляции разбор инцидента превращается в сопоставление таймстампов.

## Внешняя LLM-обсервабилити

Langfuse/Helicone и аналоги дают удобные разборы диалогов и сравнение промптов. Правила:

- Отправка — **best-effort**, обёрнутая в `.catch(() => undefined)`. Недоступность внешней
  системы не должна ронять AI-задачу.
- Отправлять **метаданные**: id выполнения, use case, версии, токены, стоимость, латентность.
  Тексты — только если это осознанное решение с учётом приватности и согласия клиентов.
- Внешняя система не является источником правды по деньгам: сверять с журналом.

## Метрики (Prometheus-стиль)

Если экспортируете метрики отдельно от журнала:

```
ai_task_total{task_type, status, model_alias}          counter
ai_task_duration_seconds{task_type}                    histogram
ai_task_cost_usd_total{workspace_id, task_type}        counter
ai_guardrail_block_total{layer, rule}                  counter
ai_tool_call_total{tool, outcome}                      counter
```

Кардинальность: `workspace_id` в метриках допустим только при ограниченном числе тенантов;
иначе агрегировать по тенанту в БД, а в метриках оставить платформенный срез.

## Готовые запросы

См. `assets/dashboards/ai-overview.md` — панели по журналу: успешность, стоимость,
латентность, распределение по физическим моделям, доля fallback, топ дорогих задач.

## Чеклист

- [ ] `model` = физическая модель, `model_alias` = логический, оба заполнены.
- [ ] `cost_usd` берётся из ответа шлюза.
- [ ] Записи создаются и в ветке ошибки.
- [ ] `correlationId` сквозной и возвращается наружу.
- [ ] В спанах и логах нет промптов, входа, результата, PII, секретов.
- [ ] Трассировка и внешняя обсервабилити — best-effort.
- [ ] Индексы под запросы дашборда есть (иначе панели лягут на объёме).
