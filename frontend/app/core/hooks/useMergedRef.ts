"use client";

import { useCallback, type Ref } from "react";

/**
 * Сливает внешний `ref` (проп) с внутренним — когда компоненту нужен доступ к
 * DOM-узлу и при этом ref должен уходить наружу (react-hook-form, фокус-менеджмент).
 *
 * Правило `react-hooks/immutability` запрещает писать в `.current` объекта,
 * пришедшего из пропсов, — но именно это и есть контракт callback-ref в React.
 * Правило выключено для этого файла в `eslint.config.mjs`, чтобы исключение
 * было ровно одно и на виду.
 */
export function useMergedRef<T>(
  externalRef: Ref<T> | undefined,
  internalRef: { current: T | null },
): (node: T | null) => void {
  return useCallback(
    (node: T | null) => {
      internalRef.current = node;

      if (!externalRef) return;
      if (typeof externalRef === "function") {
        externalRef(node);
        return;
      }
      (externalRef as { current: T | null }).current = node;
    },
    [externalRef, internalRef],
  );
}
