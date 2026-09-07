/**
 * Приводит query-параметр мультивыбора к массиву строк.
 * Поддерживает обе формы записи: `?statuses=a,b` и `?statuses=a&statuses=b`.
 * Пустое значение превращается в `undefined`, чтобы фильтр не применялся вовсе.
 */
export function toStringArrayQuery({ value }: { value: unknown }): string[] | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const raw = Array.isArray(value) ? value : String(value).split(',');
  const items = raw.map((item) => String(item).trim()).filter(Boolean);
  return items.length ? items : undefined;
}
