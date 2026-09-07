/**
 * ШАБЛОН Zustand-стора. Копировать в `app/core/store/<resource>.ts`.
 *
 * Нужен, когда состояние переживает навигацию или разделяется компонентами.
 * Разовая выборка на одной странице может обойтись без стора.
 *
 * ИНВАРИАНТЫ: стор не знает про компоненты; api-клиент не знает про стор.
 * Зависимость односторонняя: компонент → стор → api.
 */

import { create } from "zustand";

import {
  listFeatures,
  executeFeature,
  deleteFeature,
  type ListFeatureParams,
} from "../api/feature";
import type { FeatureRow } from "../validators/feature";

interface FeatureState {
  items: FeatureRow[];
  total: number;
  page: number;
  limit: number;
  filters: { status?: string[]; search?: string };

  // Три состояния минимум. «Пусто» отличается от «загрузка» — иначе пустой
  // список выглядит как вечный спиннер.
  loading: boolean;
  error: string | null;

  setFilters: (filters: FeatureState["filters"]) => void;
  setPage: (page: number) => void;
  load: () => Promise<void>;
  execute: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

/**
 * Защита от гонки: быстрая смена фильтров даёт ситуацию, когда ответ на СТАРЫЙ
 * запрос приходит после нового. Без счётчика список периодически показывает
 * результат прошлого фильтра — баг, который потом ловят неделями.
 */
let seq = 0;

const DEFAULT_LIMIT = 20;

export const useFeatureStore = create<FeatureState>((set, get) => ({
  items: [],
  total: 0,
  page: 1,
  limit: DEFAULT_LIMIT,
  filters: {},
  loading: true,
  error: null,

  setFilters: (filters) => {
    // Смена фильтра всегда возвращает на первую страницу: иначе можно оказаться
    // на странице 5 выборки, где всего две.
    set({ filters, page: 1 });
    void get().load();
  },

  setPage: (page) => {
    set({ page });
    void get().load();
  },

  load: async () => {
    const my = ++seq;
    set({ loading: true, error: null });

    try {
      const { filters, page, limit } = get();
      const params: ListFeatureParams = { ...filters, page, limit };
      const data = await listFeatures(params);

      if (my !== seq) return; // устаревший ответ — игнорируем
      set({ items: data.items, total: data.total, loading: false });
    } catch (e) {
      if (my !== seq) return;
      set({ error: (e as Error).message, loading: false });
    }
  },

  execute: async (id) => {
    const before = get().items;

    // Оптимистичное обновление — ТОЛЬКО с откатом при ошибке, иначе UI начинает врать.
    set({ items: before.map((i) => (i.id === id ? { ...i, status: "active" } : i)) });

    try {
      // Ключ идемпотентности ДЕТЕРМИНИРОВАН по бизнес-смыслу: случайный на каждый
      // клик означает, что двойной клик даст два эффекта.
      const updated = await executeFeature(id, `feature:execute:${id}`);
      set({ items: get().items.map((i) => (i.id === id ? updated : i)) });
    } catch (e) {
      set({ items: before, error: (e as Error).message }); // откат
    }
  },

  remove: async (id) => {
    const before = get().items;
    set({ items: before.filter((i) => i.id !== id) });

    try {
      await deleteFeature(id);
      // Перечитываем страницу: после удаления состав страницы сдвинулся.
      await get().load();
    } catch (e) {
      set({ items: before, error: (e as Error).message });
    }
  },
}));
