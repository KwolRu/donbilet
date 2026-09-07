"use client";

import { useEffect, useRef, useState } from "react";
import Toggle from "@/components/ui/toggle";
import { Button } from "@/components/ui/button";
import { SidePanel } from "@/components/layout-panels/side-panel";
import { Select } from "@/components/ui/select";
import { readTableSettings, writeTableSettings } from "./table-settings-storage";

type ColumnMeta<K extends string> = { key: K; label: string };

type Props<K extends string> = {
  open: boolean;
  storageKey: string;
  columns: ColumnMeta<K>[];
  visibleColumns: Record<K, boolean>;
  lockedColumns?: K[];
  pageSize?: number;
  pageSizeOptions?: number[];
  showColumnSettings?: boolean;
  onPageSizeChange?: (value: number) => void;
  onChange: (updater: (prev: Record<K, boolean>) => Record<K, boolean>) => void;
  onClose: () => void;
};

export function TableSettingsDrawer<K extends string>({
  open,
  storageKey,
  columns,
  visibleColumns,
  lockedColumns = [],
  pageSize,
  pageSizeOptions,
  showColumnSettings = true,
  onPageSizeChange,
  onChange,
  onClose,
}: Props<K>) {
  const [draftColumns, setDraftColumns] = useState<Record<K, boolean>>(visibleColumns);
  const [draftPageSize, setDraftPageSize] = useState<number | undefined>(pageSize);
  const [previousOpen, setPreviousOpen] = useState(open);
  const restoredStorageKeyRef = useRef<string | null>(null);

  if (open !== previousOpen) {
    setPreviousOpen(open);
    if (open) {
      setDraftColumns(visibleColumns);
      setDraftPageSize(pageSize);
    }
  }

  useEffect(() => {
    if (restoredStorageKeyRef.current === storageKey) return;
    restoredStorageKeyRef.current = storageKey;

    const storedSettings = readTableSettings({
      storage: window.localStorage,
      tableId: storageKey,
      columns,
      fallbackVisibleColumns: visibleColumns,
      lockedColumns,
      pageSizeOptions,
    });

    if (!storedSettings) return;

    onChange(() => storedSettings.visibleColumns);
    if (
      typeof storedSettings.pageSize === "number" &&
      storedSettings.pageSize !== pageSize &&
      onPageSizeChange
    ) {
      onPageSizeChange(storedSettings.pageSize);
    }
  }, [
    columns,
    lockedColumns,
    onChange,
    onPageSizeChange,
    pageSize,
    pageSizeOptions,
    storageKey,
    visibleColumns,
  ]);

  const handleSave = () => {
    const nextColumns = { ...draftColumns };
    for (const key of lockedColumns) {
      nextColumns[key] = true;
    }

    writeTableSettings({
      storage: window.localStorage,
      tableId: storageKey,
      columns,
      visibleColumns: nextColumns,
      lockedColumns,
      pageSize: draftPageSize,
    });

    if (typeof draftPageSize === "number" && onPageSizeChange) {
      onPageSizeChange(draftPageSize);
    }
    onChange(() => nextColumns);
    onClose();
  };

  return (
    <SidePanel
      open={open}
      title="Настройки"
      onClose={onClose}
      footer={
        <div className="flex items-center gap-4">
          <Button variant="linear" className="flex-1" onClick={onClose}>
            Отмена
          </Button>
          <Button className="flex-1" onClick={handleSave}>
            Сохранить
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        {typeof draftPageSize === "number" && pageSizeOptions?.length ? (
          <Select
            label="Пагинация"
            mode="single"
            value={[String(draftPageSize)]}
            options={pageSizeOptions.map((option) => ({
              label: `${option} строк`,
              value: String(option),
            }))}
            onChange={(value) => {
              const next = Number(value[0]);
              if (!Number.isFinite(next)) return;
              setDraftPageSize(next);
            }}
          />
        ) : null}
        {showColumnSettings ? (
          <>
            <p className="text-h2 text-text-primary">Настройка полей</p>
            {columns.map((column) => {
              const isLocked = lockedColumns.includes(column.key);
              if (isLocked) return null;
              return (
                <div key={column.key} className="flex items-center justify-between">
                  <span className="text-h3 text-text-primary">{column.label}</span>
                  <Toggle
                    checked={draftColumns[column.key]}
                    onCheckedChange={(checked) =>
                      setDraftColumns((prev) => ({ ...prev, [column.key]: checked }))
                    }
                  />
                </div>
              );
            })}
          </>
        ) : null}
      </div>
    </SidePanel>
  );
}
