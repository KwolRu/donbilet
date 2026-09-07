export type SortDirection = "asc" | "desc";

export type SortState<T extends string> = {
  key: T;
  direction: SortDirection;
} | null;

export function toggleSort<T extends string>(
  current: SortState<T>,
  key: T,
): SortState<T> {
  if (!current || current.key !== key) {
    return { key, direction: "asc" };
  }

  if (current.direction === "asc") {
    return { key, direction: "desc" };
  }

  return null;
}

export function compareValues(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (a === null || a === undefined) return 1;
  if (b === null || b === undefined) return -1;

  if (typeof a === "number" && typeof b === "number") {
    return a - b;
  }

  if (a instanceof Date && b instanceof Date) {
    return a.getTime() - b.getTime();
  }

  return String(a).localeCompare(String(b), "ru");
}
