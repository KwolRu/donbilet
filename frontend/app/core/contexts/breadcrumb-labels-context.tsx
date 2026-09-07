"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

/**
 * Динамические подписи хлебных крошек.
 *
 * `ROUTE_LABELS` покрывает статические разделы. Этот контекст — для сегментов,
 * известных только в рантайме: `/app/projects/<uuid>` → «Внутренний портал».
 * Страница детали регистрирует подпись после загрузки данных.
 */
type BreadcrumbLabels = Record<string, string>;

type BreadcrumbLabelsContextValue = {
  labels: BreadcrumbLabels;
  setLabel: (path: string, label: string) => void;
  clearLabel: (path: string) => void;
};

const BreadcrumbLabelsContext = createContext<BreadcrumbLabelsContextValue>({
  labels: {},
  setLabel: () => {},
  clearLabel: () => {},
});

export function BreadcrumbLabelsProvider({ children }: { children: ReactNode }) {
  const [labels, setLabels] = useState<BreadcrumbLabels>({});

  const setLabel = useCallback((path: string, label: string) => {
    setLabels((prev) => (prev[path] === label ? prev : { ...prev, [path]: label }));
  }, []);

  const clearLabel = useCallback((path: string) => {
    setLabels((prev) => {
      if (!(path in prev)) return prev;
      const next = { ...prev };
      delete next[path];
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ labels, setLabel, clearLabel }),
    [labels, setLabel, clearLabel],
  );

  return (
    <BreadcrumbLabelsContext.Provider value={value}>{children}</BreadcrumbLabelsContext.Provider>
  );
}

export function useBreadcrumbLabels() {
  return useContext(BreadcrumbLabelsContext);
}
