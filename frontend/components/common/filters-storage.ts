const FILTERS_STORAGE_PREFIX = "smoll-crm:filters";
const FILTERS_STORAGE_VERSION = "v1";

type ReadableStorage = Pick<Storage, "getItem">;
type WritableStorage = Pick<Storage, "setItem">;

function isFiltersValue(value: unknown): value is object {
  return typeof value === "object" && value !== null;
}

export function getFiltersStorageKey(filterId: string) {
  return `${FILTERS_STORAGE_PREFIX}:${filterId}:${FILTERS_STORAGE_VERSION}`;
}

export function parseFilters<T extends object>(raw: string | null): T | null {
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    return isFiltersValue(parsed) ? (parsed as T) : null;
  } catch {
    return null;
  }
}

export function serializeFilters<T extends object>(filters: T): string | null {
  try {
    const serialized = JSON.stringify(filters);
    return typeof serialized === "string" ? serialized : null;
  } catch {
    return null;
  }
}

export function readFilters<T extends object>(storage: ReadableStorage, filterId: string): T | null {
  try {
    return parseFilters<T>(storage.getItem(getFiltersStorageKey(filterId)));
  } catch {
    return null;
  }
}

export function writeFilters<T extends object>(
  storage: WritableStorage,
  filterId: string,
  filters: T,
): boolean {
  try {
    const serialized = serializeFilters(filters);
    if (serialized === null) return false;
    storage.setItem(getFiltersStorageKey(filterId), serialized);
    return true;
  } catch {
    return false;
  }
}
