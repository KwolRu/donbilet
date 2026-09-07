"use client";

import { useEffect, useState } from "react";

/** Стандартная задержка поиска по системе. */
export const SEARCH_DEBOUNCE_MS = 300;

/**
 * Возвращает значение с задержкой: пока пользователь печатает, обновления не проходят.
 * Нужен для полей поиска — без него каждый символ уходит отдельным запросом на сервер.
 */
export function useDebouncedValue<T>(value: T, delayMs: number = SEARCH_DEBOUNCE_MS): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    if (value === debounced) return;
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
    // debounced намеренно вне зависимостей: он меняется по таймеру и перезапустил бы эффект.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, delayMs]);

  return debounced;
}
