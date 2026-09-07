"use client";

import { useCallback, useState } from "react";

/**
 * Показывает список порциями и расширяет окно по мере скролла.
 *
 * Нужен там, где данные уже целиком в памяти (сервер отдаёт их одним запросом),
 * но рендерить весь список сразу дорого. Для таблиц с серверной пагинацией
 * используйте догрузку через API — см. `use-entity-table`.
 *
 * Окно сбрасывается, когда меняется сам список: сменили фильтр или поиск —
 * пользователь снова видит начало.
 */
export function useScrollWindow<T>(rows: T[], step: number) {
  const [limit, setLimit] = useState(step);
  // Сброс окна вычисляем во время рендера, а не в эффекте: иначе кадр между
  // сменой списка и сбросом показывает старый limit на новых данных.
  const [prevRows, setPrevRows] = useState(rows);
  const [prevStep, setPrevStep] = useState(step);

  let effectiveLimit = limit;
  if (rows !== prevRows || step !== prevStep) {
    setPrevRows(rows);
    setPrevStep(step);
    setLimit(step);
    effectiveLimit = step;
  }

  const visibleRows = rows.length > effectiveLimit ? rows.slice(0, effectiveLimit) : rows;
  const hasMore = rows.length > visibleRows.length;

  const loadMore = useCallback(() => {
    setLimit((prev) => prev + step);
  }, [step]);

  return { visibleRows, hasMore, loadMore };
}
