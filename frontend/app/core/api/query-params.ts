/**
 * Склеивает значения мультивыбора в один query-параметр: `["a","b"]` → `"a,b"`.
 * Бэкенд ждёт именно такую форму: Express 5 разбирает `key[]=a&key[]=b`
 * как отдельный ключ `key[]`, и запрос отлетает валидацией с 400.
 */
export function joinFilter(values?: string[]): string | undefined {
  return values?.length ? values.join(",") : undefined;
}
