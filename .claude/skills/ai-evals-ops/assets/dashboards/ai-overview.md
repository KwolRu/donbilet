# Дашборд AI-контура: панели и запросы

Источник правды — таблица журнала выполнений (`ai_task_executions`). Запросы ниже
копируются в Grafana/Metabase/psql как есть; поправить надо только имена схемы/полей.

Метрики Prometheus приведены там, где они дают то, чего нет в журнале (частота вызовов
инструментов, блокировки guardrail'ов в реальном времени).

> Перед использованием убедиться, что есть индексы:
> `(workspace_id, created_at DESC)`, `(workspace_id, status, created_at DESC)`,
> `(task_type, created_at DESC)`. Без них панели лягут на объёме.

---

## 1. Здоровье: успешность по статусам

```sql
SELECT
  date_trunc('hour', created_at) AS ts,
  status,
  count(*) AS n
FROM ai_task_executions
WHERE created_at > now() - interval '24 hours'
GROUP BY 1, 2
ORDER BY 1;
```

Читать: рост `failed` — сбой провайдера/шлюза; рост `needs_review` — деградация модели или
атака; **исчезновение всех статусов — тишина, тоже инцидент**.

---

## 2. Доля ошибок и ревью (SLO)

```sql
SELECT
  task_type,
  count(*)                                                          AS total,
  round(100.0 * count(*) FILTER (WHERE status = 'completed')    / count(*), 2) AS ok_pct,
  round(100.0 * count(*) FILTER (WHERE status = 'failed')       / count(*), 2) AS failed_pct,
  round(100.0 * count(*) FILTER (WHERE status = 'needs_review') / count(*), 2) AS review_pct
FROM ai_task_executions
WHERE created_at > now() - interval '7 days'
GROUP BY 1
ORDER BY total DESC;
```

Цели: `ok_pct` ≥ 97, `review_pct` ≤ 2.

---

## 3. Латентность p50/p95/p99

```sql
SELECT
  task_type,
  percentile_disc(0.50) WITHIN GROUP (ORDER BY latency_ms) AS p50,
  percentile_disc(0.95) WITHIN GROUP (ORDER BY latency_ms) AS p95,
  percentile_disc(0.99) WITHIN GROUP (ORDER BY latency_ms) AS p99
FROM ai_task_executions
WHERE created_at > now() - interval '24 hours' AND status = 'completed'
GROUP BY 1;
```

---

## 4. Стоимость: по дням и тенантам

```sql
SELECT
  date_trunc('day', created_at) AS day,
  workspace_id,
  round(sum(cost_usd)::numeric, 4) AS cost_usd,
  count(*)                          AS tasks,
  round((sum(cost_usd) / nullif(count(*), 0))::numeric, 6) AS cost_per_task
FROM ai_task_executions
WHERE created_at > now() - interval '30 days'
GROUP BY 1, 2
ORDER BY 1 DESC, 3 DESC;
```

Читать: рост `tasks` при неизменном `cost_per_task` — цикл/потерянная идемпотентность;
рост `cost_per_task` — раздулся контекст или сменилась модель.

---

## 5. Кто реально отвечает: алиас vs физическая модель

```sql
SELECT
  model_alias,
  model                                        AS physical_model,
  provider,
  count(*)                                     AS n,
  round(sum(cost_usd)::numeric, 4)             AS cost_usd,
  round(avg(latency_ms))                       AS avg_ms
FROM ai_task_executions
WHERE created_at > now() - interval '24 hours' AND model IS NOT NULL
GROUP BY 1, 2, 3
ORDER BY n DESC;
```

**Самая важная панель.** Если для одного `model_alias` появляются разные `physical_model` —
срабатывает fallback. Постоянный fallback = основной маршрут нездоров.

Если `physical_model` совпадает с `model_alias` — журнал пишет алиас вместо физической
модели (дефект наблюдаемости, см. antipatterns №6).

---

## 6. Доля fallback

```sql
WITH expected AS (
  SELECT use_case, model_alias FROM ai_routing_policies WHERE is_active AND workspace_id IS NULL
)
SELECT
  e.task_type,
  round(100.0 * count(*) FILTER (WHERE e.provider <> primary_provider(e.model_alias)) / count(*), 2) AS fallback_pct
FROM ai_task_executions e
WHERE e.created_at > now() - interval '24 hours'
GROUP BY 1;
```

Проще (без вспомогательной функции): считать долю выполнений, где `provider` не равен
ожидаемому для алиаса — список ожидаемых берётся из конфига шлюза.

---

## 7. Топ дорогих выполнений

```sql
SELECT id, task_type, model, cost_usd, prompt_tokens, completion_tokens, latency_ms, created_at
FROM ai_task_executions
WHERE created_at > now() - interval '24 hours'
ORDER BY cost_usd DESC NULLS LAST
LIMIT 20;
```

Разовые выбросы почти всегда означают раздутый контекст или зацикленный tool-loop.

---

## 8. Версии промптов в проде

```sql
SELECT prompt_key, prompt_version, count(*) AS n, min(created_at) AS first_seen
FROM ai_task_executions
WHERE created_at > now() - interval '7 days'
GROUP BY 1, 2
ORDER BY 1, 2;
```

Читать: две версии одновременно — идёт раскатка или где-то залип кэш. При разборе регресса
это первая панель, куда смотреть.

---

## 9. Идемпотентность работает?

```sql
SELECT
  count(*)                                            AS total,
  count(*) FILTER (WHERE attempts > 1)                AS retried,
  round(100.0 * count(*) FILTER (WHERE attempts > 1) / count(*), 2) AS retry_pct
FROM ai_task_executions
WHERE created_at > now() - interval '24 hours';
```

Плюс проверка на дубли смысла (одинаковая задача по одной сущности несколько раз за час):

```sql
SELECT task_type, (stored_result -> 'result' ->> 'entityId') AS entity, count(*)
FROM ai_task_executions
WHERE created_at > now() - interval '1 hour' AND status = 'completed'
GROUP BY 1, 2 HAVING count(*) > 1
ORDER BY 3 DESC;
```

---

## 10. Метрики Prometheus (то, чего нет в журнале)

```promql
# Частота вызовов инструментов и отказов политики
sum by (tool, outcome) (rate(ai_tool_call_total[5m]))

# Блокировки guardrail'ов по слою и правилу
sum by (layer, rule) (rate(ai_guardrail_block_total[15m]))

# p95 латентности
histogram_quantile(0.95, sum by (le, task_type) (rate(ai_task_duration_seconds_bucket[15m])))

# Тишина: ноль выполнений при обычном ненулевом трафике
sum(rate(ai_task_total[15m])) == 0
```

Кардинальность: `workspace_id` в метки только при ограниченном числе тенантов; иначе
тенантный срез считать в БД.
