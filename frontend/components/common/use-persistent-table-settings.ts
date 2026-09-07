"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import {
  getTableSettingsStorageKey,
  readTableSettings,
  writeTableSettings,
} from "./table-settings-storage";

type ColumnMeta<K extends string> = { key: K };

type Options<K extends string> = {
  tableId: string;
  columns: ColumnMeta<K>[];
  defaultVisibleColumns: Record<K, boolean>;
  lockedColumns?: K[];
  defaultPageSize: number;
  pageSizeOptions?: number[];
};

type TableSettingsSnapshot<K extends string> = {
  visibleColumns: Record<K, boolean>;
  pageSize: number;
};

type CachedSnapshot = {
  raw: string | null;
  value: TableSettingsSnapshot<string>;
};

const snapshots = new Map<string, CachedSnapshot>();
const volatileSnapshots = new Map<string, TableSettingsSnapshot<string>>();
const listeners = new Map<string, Set<() => void>>();
let listensToStorage = false;

function emit(storageKey: string) {
  listeners.get(storageKey)?.forEach((listener) => listener());
}

function ensureStorageListener() {
  if (listensToStorage || typeof window === "undefined") return;
  window.addEventListener("storage", (event) => {
    if (!event.key) {
      snapshots.clear();
      volatileSnapshots.clear();
      listeners.forEach((_value, storageKey) => emit(storageKey));
      return;
    }
    if (!listeners.has(event.key)) return;
    snapshots.delete(event.key);
    volatileSnapshots.delete(event.key);
    emit(event.key);
  });
  listensToStorage = true;
}

function subscribe(tableId: string, listener: () => void) {
  ensureStorageListener();
  const storageKey = getTableSettingsStorageKey(tableId);
  const tableListeners = listeners.get(storageKey) ?? new Set<() => void>();
  tableListeners.add(listener);
  listeners.set(storageKey, tableListeners);
  return () => {
    tableListeners.delete(listener);
    if (tableListeners.size === 0) listeners.delete(storageKey);
  };
}

function readSnapshot<K extends string>(
  options: Options<K>,
  fallback: TableSettingsSnapshot<K>,
): TableSettingsSnapshot<K> {
  const storageKey = getTableSettingsStorageKey(options.tableId);
  const volatileSnapshot = volatileSnapshots.get(storageKey);
  if (volatileSnapshot) return volatileSnapshot as TableSettingsSnapshot<K>;

  let raw: string | null;
  try {
    raw = window.localStorage.getItem(storageKey);
  } catch {
    return fallback;
  }

  const cached = snapshots.get(storageKey);
  if (cached?.raw === raw) return cached.value as TableSettingsSnapshot<K>;

  const storedSettings = readTableSettings({
    storage: window.localStorage,
    tableId: options.tableId,
    columns: options.columns,
    fallbackVisibleColumns: options.defaultVisibleColumns,
    lockedColumns: options.lockedColumns,
    pageSizeOptions: options.pageSizeOptions,
  });
  const value: TableSettingsSnapshot<K> = storedSettings
    ? {
        visibleColumns: storedSettings.visibleColumns,
        pageSize: storedSettings.pageSize ?? fallback.pageSize,
      }
    : fallback;
  snapshots.set(storageKey, {
    raw,
    value: value as TableSettingsSnapshot<string>,
  });
  return value;
}

function storeSnapshot<K extends string>(options: Options<K>, value: TableSettingsSnapshot<K>) {
  const storageKey = getTableSettingsStorageKey(options.tableId);
  const stored = writeTableSettings({
    storage: window.localStorage,
    tableId: options.tableId,
    columns: options.columns,
    visibleColumns: value.visibleColumns,
    lockedColumns: options.lockedColumns,
    pageSize: value.pageSize,
  });
  snapshots.delete(storageKey);
  if (stored) volatileSnapshots.delete(storageKey);
  else volatileSnapshots.set(storageKey, value as TableSettingsSnapshot<string>);
  emit(storageKey);
}

export function usePersistentTableSettings<K extends string>(options: Options<K>) {
  const [fallback] = useState<TableSettingsSnapshot<K>>(() => ({
    visibleColumns: options.defaultVisibleColumns,
    pageSize: options.defaultPageSize,
  }));
  const subscribeToSettings = useCallback(
    (listener: () => void) => subscribe(options.tableId, listener),
    [options.tableId],
  );
  const getSnapshot = useCallback(() => readSnapshot(options, fallback), [fallback, options]);
  const getServerSnapshot = useCallback(() => fallback, [fallback]);
  const settings = useSyncExternalStore(subscribeToSettings, getSnapshot, getServerSnapshot);

  const setVisibleColumns = useCallback(
    (updater: (previous: Record<K, boolean>) => Record<K, boolean>) => {
      const current = readSnapshot(options, fallback);
      storeSnapshot(options, {
        ...current,
        visibleColumns: updater(current.visibleColumns),
      });
    },
    [fallback, options],
  );

  const setPageSize = useCallback(
    (pageSize: number) => {
      const current = readSnapshot(options, fallback);
      storeSnapshot(options, { ...current, pageSize });
    },
    [fallback, options],
  );

  return { ...settings, setVisibleColumns, setPageSize };
}
