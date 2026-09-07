const TABLE_SETTINGS_STORAGE_PREFIX = "smoll-crm:table-settings";
const TABLE_SETTINGS_STORAGE_VERSION = "v1";

type ColumnMeta<K extends string> = { key: K };

type ReadableStorage = Pick<Storage, "getItem">;
type WritableStorage = Pick<Storage, "setItem">;

type ReadTableSettingsOptions<K extends string> = {
  storage: ReadableStorage;
  tableId: string;
  columns: ColumnMeta<K>[];
  fallbackVisibleColumns: Record<K, boolean>;
  lockedColumns?: K[];
  pageSizeOptions?: number[];
};

type WriteTableSettingsOptions<K extends string> = {
  storage: WritableStorage;
  tableId: string;
  columns: ColumnMeta<K>[];
  visibleColumns: Record<K, boolean>;
  lockedColumns?: K[];
  pageSize?: number;
};

export type StoredTableSettings<K extends string> = {
  visibleColumns: Record<K, boolean>;
  pageSize?: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function getTableSettingsStorageKey(tableId: string) {
  return `${TABLE_SETTINGS_STORAGE_PREFIX}:${tableId}:${TABLE_SETTINGS_STORAGE_VERSION}`;
}

export function readTableSettings<K extends string>({
  storage,
  tableId,
  columns,
  fallbackVisibleColumns,
  lockedColumns = [],
  pageSizeOptions,
}: ReadTableSettingsOptions<K>): StoredTableSettings<K> | null {
  try {
    const raw = storage.getItem(getTableSettingsStorageKey(tableId));
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return null;

    const visibleColumns = { ...fallbackVisibleColumns };
    const storedColumns = parsed.visibleColumns;
    let hasStoredValue = false;

    if (isRecord(storedColumns)) {
      for (const { key } of columns) {
        const storedValue = storedColumns[key];
        if (typeof storedValue !== "boolean") continue;
        visibleColumns[key] = storedValue;
        hasStoredValue = true;
      }
    }

    for (const key of lockedColumns) {
      visibleColumns[key] = true;
    }

    const storedPageSize = parsed.pageSize;
    const pageSizeIsAllowed =
      typeof storedPageSize === "number" &&
      Number.isInteger(storedPageSize) &&
      storedPageSize > 0 &&
      (!pageSizeOptions?.length || pageSizeOptions.includes(storedPageSize));

    if (pageSizeIsAllowed) {
      hasStoredValue = true;
    }

    if (!hasStoredValue) return null;

    return {
      visibleColumns,
      pageSize: pageSizeIsAllowed ? storedPageSize : undefined,
    };
  } catch {
    return null;
  }
}

export function writeTableSettings<K extends string>({
  storage,
  tableId,
  columns,
  visibleColumns,
  lockedColumns = [],
  pageSize,
}: WriteTableSettingsOptions<K>): boolean {
  try {
    const lockedColumnSet = new Set<K>(lockedColumns);
    const storedVisibleColumns: Record<string, boolean> = {};

    for (const { key } of columns) {
      storedVisibleColumns[key] = lockedColumnSet.has(key) ? true : Boolean(visibleColumns[key]);
    }

    const payload: { visibleColumns: Record<string, boolean>; pageSize?: number } = {
      visibleColumns: storedVisibleColumns,
    };

    if (typeof pageSize === "number" && Number.isInteger(pageSize) && pageSize > 0) {
      payload.pageSize = pageSize;
    }

    storage.setItem(getTableSettingsStorageKey(tableId), JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}
