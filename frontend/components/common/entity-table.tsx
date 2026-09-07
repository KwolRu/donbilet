"use client";

import { ListX, PencilLine, Trash2, Undo, UserRoundX } from "lucide-react";
import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { UsersRoundUnlinkIcon } from "@/components/common/users-round-unlink-icon";
import { Checkbox } from "@/components/ui/checkbox";
import { SortableColumnHeader } from "@/components/common/sortable-column-header";
import { compareValues, toggleSort, type SortState } from "@app/core/utils/table-sort";

/** Ниже этого числа строк виртуализация только мешает — рендерим как есть. */
const VIRTUALIZE_THRESHOLD = 60;
/** Стартовая оценка высоты строки; уточняется измерением реальных строк. */
const ESTIMATED_ROW_HEIGHT = 56;
/** За сколько пикселей до конца списка просить следующую порцию. */
const LOAD_MORE_OFFSET_PX = 400;

export type EntityColumn<T, K extends string> = {
  key: K;
  label: string;
  className?: string;
  headerClassName?: string;
  getSortValue?: (row: T) => string | number;
  renderCell: (row: T) => ReactNode;
};

type Props<T extends { id: string }, K extends string> = {
  rows: T[];
  loading: boolean;
  visibleColumns: Record<K, boolean>;
  columns: EntityColumn<T, K>[];
  sort: SortState<K>;
  selectedIds: string[];
  emptyText: string;
  onSortChange: (next: SortState<K>) => void;
  onToggleRow: (id: string, checked: boolean) => void;
  onToggleAll: (checked: boolean) => void;
  onEdit: (row: T) => void;
  onArchive: (row: T) => void;
  archiveLabel: string;
  restoreLabel?: string;
  getArchiveActionType?: (row: T) => "archive" | "restore";
  hideRowActions?: boolean;
  hideSelection?: boolean;
  hideEdit?: boolean;
  /** Вместо корзины — иконка отвязки (профиль педагога). */
  useUnlinkIcon?: boolean;
  unlinkIcon?: "student" | "group" | "course";
  footer?: ReactNode;
  /** Футер закреплён внизу области таблицы (не уезжает при вертикальном скролле). */
  pinnedFooter?: ReactNode;
  /** Общий colgroup для основной таблицы и pinnedFooter (выравнивание колонок). */
  colGroup?: ReactNode;
  /** Открыть карточку сущности по клику на строку. */
  onRowClick?: (row: T) => void;
  /** Переопределить стандартные действия строки. */
  renderRowActions?: (row: T) => ReactNode;
  /** Дополнительная строка под сущностью, например детализация заказа. */
  renderExpandedRow?: (row: T) => ReactNode;
  /** Управляет открытым состоянием дополнительной строки. */
  isRowExpanded?: (row: T) => boolean;
  getRowClassName?: (row: T) => string;
  /** Запросить следующую порцию строк — вызывается при подходе скролла к концу списка. */
  onLoadMore?: () => void;
  /** Есть ли что догружать. */
  hasMore?: boolean;
  /** Идёт догрузка — показываем строку-индикатор. */
  loadingMore?: boolean;
  /** Включить виртуальный рендер независимо от количества уже загруженных строк. */
  forceVirtualization?: boolean;
};

export function EntityTable<T extends { id: string }, K extends string>({
  rows,
  loading,
  visibleColumns,
  columns,
  sort,
  selectedIds,
  emptyText,
  onSortChange,
  onToggleRow,
  onToggleAll,
  onEdit,
  onArchive,
  archiveLabel,
  restoreLabel = "Вернуть из архива",
  getArchiveActionType,
  hideRowActions = false,
  hideSelection = false,
  hideEdit = false,
  useUnlinkIcon = false,
  unlinkIcon = "student",
  footer,
  pinnedFooter,
  colGroup,
  onRowClick,
  renderRowActions,
  renderExpandedRow,
  isRowExpanded,
  getRowClassName,
  onLoadMore,
  hasMore = false,
  loadingMore = false,
  forceVirtualization = false,
}: Props<T, K>) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const mainTableRef = useRef<HTMLTableElement>(null);
  const [mainTableWidth, setMainTableWidth] = useState(0);
  const [isScrolledX, setIsScrolledX] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const visible = columns.filter((column) => visibleColumns[column.key]);
  const sortedRows = [...rows].sort((a, b) => {
    if (!sort) return 0;
    const column = columns.find((item) => item.key === sort.key);
    if (!column?.getSortValue) return 0;
    const result = compareValues(column.getSortValue(a), column.getSortValue(b));
    return sort.direction === "asc" ? result : -result;
  });

  const allSelected = rows.length > 0 && selectedIds.length === rows.length;
  const isIndeterminate = selectedIds.length > 0 && !allSelected;
  const firstStickyKey = visible[0]?.key;
  const firstStickyLeftClass = hideSelection ? "left-0" : "left-[44px]";
  const stickyLeftShadowClass = `relative after:content-[''] after:absolute after:top-0 after:-right-4 after:h-full after:w-4 after:pointer-events-none after:bg-gradient-to-r after:from-black/4 after:to-transparent after:transition-opacity ${
    isScrolledX ? "after:opacity-100" : "after:opacity-0"
  }`;
  const stickyRightShadowClass = `relative before:content-[''] before:absolute before:top-0 before:-left-4 before:h-full before:w-4 before:pointer-events-none before:bg-gradient-to-l before:from-black/4 before:to-transparent before:transition-opacity ${
    canScrollRight ? "before:opacity-100" : "before:opacity-0"
  }`;

  /**
   * Раскрывающиеся строки и закреплённый футер меняют высоту непредсказуемо —
   * там виртуализация не включается, чтобы не ломать раскладку.
   */
  const virtualized =
    (forceVirtualization || sortedRows.length > VIRTUALIZE_THRESHOLD) &&
    !renderExpandedRow &&
    !pinnedFooter;

  // Окно рендера смещено на высоту залипшего заголовка: виртуализатор отсчитывает
  // позиции от начала контейнера, а строки начинаются под thead. Разница меньше
  // одной строки и полностью укрывается overscan, поэтому не компенсируем её вручную —
  // иначе пришлось бы вычитать paddingStart из спейсеров и рассинхронить общую высоту.
  const rowVirtualizer = useVirtualizer({
    count: sortedRows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ESTIMATED_ROW_HEIGHT,
    overscan: 12,
  });

  const virtualItems = virtualized ? rowVirtualizer.getVirtualItems() : [];
  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
  const paddingBottom =
    virtualItems.length > 0
      ? rowVirtualizer.getTotalSize() - virtualItems[virtualItems.length - 1].end
      : 0;

  const loadMoreRef = useRef(onLoadMore);
  const requestedRowsLengthRef = useRef<number | null>(null);
  useEffect(() => {
    loadMoreRef.current = onLoadMore;
  }, [onLoadMore]);

  useEffect(() => {
    if (
      loading ||
      !hasMore ||
      (requestedRowsLengthRef.current !== null && requestedRowsLengthRef.current !== rows.length)
    ) {
      requestedRowsLengthRef.current = null;
    }
  }, [hasMore, loading, rows.length]);

  const maybeLoadMore = useCallback(
    (element: HTMLDivElement) => {
      if (!hasMore || loadingMore || !loadMoreRef.current) return;
      if (requestedRowsLengthRef.current === rows.length) return;
      const distanceToBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
      if (distanceToBottom <= LOAD_MORE_OFFSET_PX) {
        requestedRowsLengthRef.current = rows.length;
        loadMoreRef.current();
      }
    },
    [hasMore, loadingMore, rows.length],
  );

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    const updateScrollState = () => {
      const maxScrollLeft = element.scrollWidth - element.clientWidth;
      setIsScrolledX(element.scrollLeft > 0);
      setCanScrollRight(maxScrollLeft - element.scrollLeft > 1);
      maybeLoadMore(element);
    };

    updateScrollState();
    element.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    return () => {
      element.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [rows.length, visible.length, maybeLoadMore]);

  useLayoutEffect(() => {
    if (!pinnedFooter) return;
    const table = mainTableRef.current;
    if (!table) return;
    const update = () => setMainTableWidth(table.offsetWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(table);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [pinnedFooter, rows.length, visible.length, sortedRows.length]);

  const tableClassName = pinnedFooter
    ? "w-full table-fixed border-separate border-spacing-0"
    : "min-w-max w-full border-separate border-spacing-0";

  const tableBody = (
    <table ref={pinnedFooter ? mainTableRef : undefined} className={tableClassName}>
      {colGroup}
      <thead className="bg-bg-surface-base-default">
        <tr>
          {!hideSelection ? (
            <th className="sticky top-0 left-0 z-30 w-[44px] border-b border-border-subtle bg-white px-3 py-3">
              <div className="flex items-center justify-center">
                <Checkbox
                  checkedState={isIndeterminate ? "indeterminate" : allSelected}
                  onCheckedChange={onToggleAll}
                  aria-label="Выбрать все строки"
                />
              </div>
            </th>
          ) : null}
          {visible.map((column) => (
            <th
              key={column.key}
              className={`sticky top-0 z-20 whitespace-nowrap border-b border-border-subtle bg-white px-4 py-4 text-left ${column.key === firstStickyKey ? `${firstStickyLeftClass} z-30 ${stickyLeftShadowClass}` : ""} ${column.headerClassName ?? ""}`}
            >
              {column.getSortValue ? (
                <SortableColumnHeader
                  label={column.label}
                  columnKey={column.key}
                  sort={sort}
                  onSort={(key) => onSortChange(toggleSort(sort, key))}
                />
              ) : (
                <span className="text-text-secondary text-body-regular">{column.label}</span>
              )}
            </th>
          ))}
          {!hideRowActions ? (
            <th
              className={`sticky top-0 right-0 z-30 bg-white px-4 py-3 whitespace-nowrap border-b border-border-subtle ${stickyRightShadowClass}`}
              aria-label="Действия"
            />
          ) : null}
        </tr>
      </thead>
      <tbody>
        {virtualized && paddingTop > 0 ? (
          <tr aria-hidden="true" style={{ height: paddingTop }} />
        ) : null}
        {(virtualized
          ? virtualItems.map((item) => ({ row: sortedRows[item.index], index: item.index }))
          : sortedRows.map((row, index) => ({ row, index }))
        ).map(({ row, index }) => {
          const isSelected = selectedIds.includes(row.id);
          const rowBorderClass =
            index === sortedRows.length - 1 ? "" : "border-b border-border-subtle";
          const expandedContent = renderExpandedRow?.(row);
          const isExpanded = renderExpandedRow
            ? (isRowExpanded?.(row) ?? Boolean(expandedContent))
            : false;
          const colSpan =
            visible.length + (hideSelection ? 0 : 1) + (hideRowActions ? 0 : 1);

          return (
            <Fragment key={row.id}>
              <tr
                data-index={index}
                // Реальные высоты строк разные (например, две строки контактов),
                // поэтому виртуализатор их домеряет после рендера.
                ref={virtualized ? rowVirtualizer.measureElement : undefined}
                role={onRowClick ? "button" : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                aria-expanded={renderExpandedRow ? isExpanded : undefined}
                onClick={() => onRowClick?.(row)}
                onKeyDown={(event) => {
                  if (!onRowClick || (event.key !== "Enter" && event.key !== " ")) return;
                  event.preventDefault();
                  onRowClick(row);
                }}
                className={`${onRowClick ? "cursor-pointer focus-visible:ring-2 focus-visible:ring-primary" : ""} ${getRowClassName?.(row) ?? ""}`}
              >
                {!hideSelection ? (
                  <td
                    className={`sticky left-0 z-10 w-[44px] bg-white px-3 py-3 align-middle ${rowBorderClass}`}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="flex items-center justify-center">
                      <Checkbox
                        checkedState={isSelected}
                        onCheckedChange={(next) => onToggleRow(row.id, next)}
                        aria-label="Выбрать строку"
                      />
                    </div>
                  </td>
                ) : null}
                {visible.map((column) => (
                  <td
                    key={column.key}
                    className={`whitespace-nowrap px-4 py-3 align-middle ${column.key === firstStickyKey ? `sticky ${firstStickyLeftClass} z-20 bg-white ${stickyLeftShadowClass}` : ""} ${rowBorderClass} ${column.className ?? ""}`}
                  >
                    {column.renderCell(row)}
                  </td>
                ))}
                {!hideRowActions ? (
                  <td
                    className={`sticky right-0 z-20 bg-white px-4 py-3 align-middle ${stickyRightShadowClass} ${rowBorderClass}`}
                    onClick={(event) => event.stopPropagation()}
                  >
                    {renderRowActions ? (
                      renderRowActions(row)
                    ) : (
                      <div className="flex items-center justify-end gap-4 text-icon-secondary">
                        <button
                          type="button"
                          className="hover:text-icon-hover transition-colors"
                          title={
                            getArchiveActionType?.(row) === "restore" ? restoreLabel : archiveLabel
                          }
                          aria-label={
                            getArchiveActionType?.(row) === "restore" ? restoreLabel : archiveLabel
                          }
                          onClick={() => onArchive(row)}
                        >
                          {getArchiveActionType?.(row) === "restore" ? (
                            <Undo className="h-4 w-4" aria-hidden="true" />
                          ) : useUnlinkIcon ? (
                            unlinkIcon === "group" ? (
                              <UsersRoundUnlinkIcon className="h-4 w-4" />
                            ) : unlinkIcon === "course" ? (
                              <ListX className="h-4 w-4" aria-hidden="true" />
                            ) : (
                              <UserRoundX className="h-4 w-4" aria-hidden="true" />
                            )
                          ) : (
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          )}
                        </button>
                        {!hideEdit ? (
                          <button
                            type="button"
                            className="hover:text-icon-hover transition-colors"
                            onClick={() => onEdit(row)}
                            aria-label="Редактировать"
                          >
                            <PencilLine className="h-4 w-4" aria-hidden="true" />
                          </button>
                        ) : null}
                      </div>
                    )}
                  </td>
                ) : null}
              </tr>
              {renderExpandedRow ? (
                <tr aria-hidden={!isExpanded}>
                  <td
                    colSpan={colSpan}
                    className={`bg-white transition-colors duration-300 motion-reduce:transition-none ${
                      isExpanded ? "border-b border-border-subtle" : ""
                    }`}
                  >
                    <div
                      className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${
                        isExpanded
                          ? "grid-rows-[1fr] opacity-100"
                          : "grid-rows-[0fr] opacity-0"
                      }`}
                    >
                      <div className="min-h-0 overflow-hidden" inert={!isExpanded}>
                        {expandedContent}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : null}
            </Fragment>
          );
        })}
        {virtualized && paddingBottom > 0 ? (
          <tr aria-hidden="true" style={{ height: paddingBottom }} />
        ) : null}
        {loadingMore ? (
          <tr>
            <td
              colSpan={visible.length + (hideSelection ? 0 : 1) + (hideRowActions ? 0 : 1)}
              className="px-4 py-4 text-center text-body-regular text-text-secondary"
            >
              Загружаем ещё…
            </td>
          </tr>
        ) : null}
        {!loading && sortedRows.length === 0 && (
          <tr>
            <td
              colSpan={visible.length + (hideSelection ? 0 : 1) + (hideRowActions ? 0 : 1)}
              className="px-4 py-10 text-center text-text-secondary"
            >
              {emptyText}
            </td>
          </tr>
        )}
      </tbody>
      {!pinnedFooter && footer ? <tfoot>{footer}</tfoot> : null}
    </table>
  );

  if (pinnedFooter) {
    return (
      <div
        ref={scrollRef}
        className="custom-scrollbar relative flex h-full min-h-0 w-full max-w-full flex-1 flex-col overflow-auto overscroll-contain"
      >
        {tableBody}
        <div
          className="sticky bottom-0 z-20 mt-auto shrink-0"
          style={{ width: mainTableWidth > 0 ? mainTableWidth : undefined, minWidth: "100%" }}
        >
          <table
            className="w-full table-fixed border-separate border-spacing-0"
            style={{ width: mainTableWidth > 0 ? mainTableWidth : "100%" }}
          >
            {colGroup}
            <tbody>{pinnedFooter}</tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="custom-scrollbar h-full min-h-0 w-full max-w-full flex-1 overflow-auto overscroll-contain"
    >
      {tableBody}
    </div>
  );
}
