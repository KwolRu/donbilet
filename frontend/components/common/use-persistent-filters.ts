"use client";

import { useCallback, useState, useSyncExternalStore, type Dispatch, type SetStateAction } from "react";
import { createPersistentFiltersStore } from "./persistent-filters-store";

let listensToStorage = false;

function getLocalStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

const browserFiltersStore = createPersistentFiltersStore(getLocalStorage);

function ensureStorageListener() {
  if (listensToStorage || typeof window === "undefined") return;

  window.addEventListener("storage", (event) =>
    browserFiltersStore.handleStorageChange(event.key, event.storageArea),
  );
  listensToStorage = true;
}

function subscribe(filterId: string, listener: () => void) {
  ensureStorageListener();
  return browserFiltersStore.subscribe(filterId, listener);
}

export function usePersistentFilters<T extends object>(
  filterId: string,
  initialFilters: T,
): readonly [T, Dispatch<SetStateAction<T>>] {
  const [fallback] = useState(initialFilters);
  const subscribeToFilters = useCallback(
    (listener: () => void) => subscribe(filterId, listener),
    [filterId],
  );
  const getSnapshot = useCallback(
    () => browserFiltersStore.read(filterId, fallback),
    [fallback, filterId],
  );
  const getServerSnapshot = useCallback(() => fallback, [fallback]);
  const filters = useSyncExternalStore(subscribeToFilters, getSnapshot, getServerSnapshot);

  const setFilters = useCallback<Dispatch<SetStateAction<T>>>(
    (nextFilters) => {
      browserFiltersStore.set(filterId, fallback, nextFilters);
    },
    [fallback, filterId],
  );

  return [filters, setFilters] as const;
}
