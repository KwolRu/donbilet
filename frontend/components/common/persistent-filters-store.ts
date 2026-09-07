import {
  getFiltersStorageKey,
  parseFilters,
  serializeFilters,
  writeFilters,
} from "./filters-storage";

type FiltersSnapshot = {
  raw: string | null;
  value: object | null;
};

export type FiltersUpdate<T extends object> = T | ((previousFilters: T) => T);

export function createPersistentFiltersStore(getStorage: () => Storage | null) {
  const snapshots = new Map<string, FiltersSnapshot>();
  const volatileSnapshots = new Map<string, object>();
  const listeners = new Map<string, Set<() => void>>();

  const resolveStorage = () => {
    try {
      return getStorage();
    } catch {
      return null;
    }
  };

  const emit = (storageKey: string) => {
    listeners.get(storageKey)?.forEach((listener) => listener());
  };

  const read = <T extends object>(filterId: string, fallback: T): T => {
    const storageKey = getFiltersStorageKey(filterId);
    const volatileSnapshot = volatileSnapshots.get(storageKey);
    if (volatileSnapshot) return volatileSnapshot as T;

    const storage = resolveStorage();
    if (!storage) return (snapshots.get(storageKey)?.value as T | null) ?? fallback;

    let raw: string | null;
    try {
      raw = storage.getItem(storageKey);
    } catch {
      return (snapshots.get(storageKey)?.value as T | null) ?? fallback;
    }

    const cached = snapshots.get(storageKey);
    if (cached?.raw === raw) return (cached.value as T | null) ?? fallback;

    const value = parseFilters<T>(raw);
    snapshots.set(storageKey, { raw, value });
    return value ?? fallback;
  };

  const set = <T extends object>(
    filterId: string,
    fallback: T,
    update: FiltersUpdate<T>,
  ): T => {
    const resolvedFilters =
      typeof update === "function"
        ? (update as (previousFilters: T) => T)(read(filterId, fallback))
        : update;

    const storageKey = getFiltersStorageKey(filterId);
    const storage = resolveStorage();
    const serialized = serializeFilters(resolvedFilters);
    const stored = Boolean(
      storage && serialized !== null && writeFilters(storage, filterId, resolvedFilters),
    );

    if (stored) {
      snapshots.set(storageKey, { raw: serialized, value: resolvedFilters });
      volatileSnapshots.delete(storageKey);
    } else {
      volatileSnapshots.set(storageKey, resolvedFilters);
    }
    emit(storageKey);
    return resolvedFilters;
  };

  const subscribe = (filterId: string, listener: () => void) => {
    const storageKey = getFiltersStorageKey(filterId);
    let filterListeners = listeners.get(storageKey);
    if (!filterListeners) {
      filterListeners = new Set();
      listeners.set(storageKey, filterListeners);
    }
    filterListeners.add(listener);

    return () => {
      filterListeners.delete(listener);
      if (filterListeners.size === 0) listeners.delete(storageKey);
    };
  };

  const handleStorageChange = (storageKey: string | null, storageArea?: Storage | null) => {
    const storage = resolveStorage();
    if (storage && storageArea && storageArea !== storage) return;

    if (!storageKey) {
      snapshots.clear();
      volatileSnapshots.clear();
      listeners.forEach((_filterListeners, activeStorageKey) => emit(activeStorageKey));
      return;
    }
    if (!listeners.has(storageKey)) return;
    snapshots.delete(storageKey);
    volatileSnapshots.delete(storageKey);
    emit(storageKey);
  };

  return { read, set, subscribe, handleStorageChange };
}
