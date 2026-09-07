"use client";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { SidePanel } from "@/components/layout-panels/side-panel";
import { TagChip } from "@/components/common/tag-chip";
import { NoticeBlock } from "@/components/ui/notice-block";

type Props = {
  open: boolean;
  mode: "archive" | "restore";
  title?: string;
  items: { id: string; label: string }[];
  showReason?: boolean;
  warningText: string;
  warningHeading?: string;
  onRemoveItem?: (id: string) => void;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
};

export function ArchiveActionDrawer({
  open,
  mode,
  title,
  items,
  showReason = true,
  warningText,
  warningHeading,
  onRemoveItem,
  onClose,
  onConfirm,
}: Props) {
  const actionLabel = mode === "archive" ? "Архивировать" : "Вернуть";
  return (
    <SidePanel
      open={open}
      title={title ?? actionLabel}
      onClose={onClose}
      footer={
        <div className="flex items-center gap-4">
          <Button variant="linear" className="flex-1" onClick={onClose}>
            Отмена
          </Button>
          <Button
            className="flex-1"
            onClick={async () => {
              await onConfirm();
              onClose();
            }}
          >
            {actionLabel}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {items.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {items.map((item) => (
              <TagChip
                key={item.id}
                label={item.label}
                removable={Boolean(onRemoveItem)}
                onRemove={() => onRemoveItem?.(item.id)}
              />
            ))}
          </div>
        ) : null}

        <NoticeBlock heading={warningHeading} text={warningText} variant="warning" />

        {showReason ? (
          <Select
            label="Причина"
            mode="single"
            value={["finance"]}
            options={[
              { label: "Финансовые проблемы", value: "finance" },
              { label: "Переезд", value: "move" },
              { label: "Другое", value: "other" },
            ]}
            onChange={() => undefined}
          />
        ) : null}
      </div>
    </SidePanel>
  );
}
