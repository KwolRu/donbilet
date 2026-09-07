"use client";

import { FunnelX } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  onReset: () => void;
  onCancel: () => void;
  onApply: () => void;
};

export function FilterDrawerFooter({ onReset, onCancel, onApply }: Props) {
  return (
    <div className="flex items-center gap-4">
      <Button variant="ghost" onClick={onReset} title="Сбросить" aria-label="Сбросить фильтр">
        <FunnelX className="h-6 w-6" />
      </Button>
      <Button variant="linear" className="flex-1" onClick={onCancel}>
        Отмена
      </Button>
      <Button className="flex-1" onClick={onApply}>
        Применить
      </Button>
    </div>
  );
}
