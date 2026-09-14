"use client";

import { useEffect, useState } from "react";

// Временное клиентское хранилище для разделов ЛК, у которых backend ещё не готов
// (Избранное, Пассажиры, Оценки — ТЗ п.5, 6, 8). Когда появятся серверные
// эндпоинты, эти хуки заменяются на fetch к /api/lk/* без изменения UI.
export function useLocalList<T>(key: string): [T[], (items: T[]) => void] {
  const [items, setItems] = useState<T[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      // Инициализация из внешнего хранилища на маунте (не через useState-initializer,
      // чтобы избежать рассинхрона гидрации SSR). Правило здесь не применимо.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setItems(JSON.parse(raw) as T[]);
    } catch {
      /* приватный режим / нет доступа — работаем с пустым списком */
    }
  }, [key]);

  function save(next: T[]) {
    setItems(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      /* игнорируем ошибки записи */
    }
  }

  return [items, save];
}
