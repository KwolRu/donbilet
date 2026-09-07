"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/common/search-input";

type Props = {
  search: string;
  searchPlaceholder?: string;
  inviteLabel: string;
  onSearchChange: (value: string) => void;
  onOpenInvite: () => void;
};

export function TableToolbarActions({
  search,
  searchPlaceholder = "Поиск...",
  inviteLabel,
  onSearchChange,
  onOpenInvite,
}: Props) {
  return (
    <div className="flex items-center gap-4">
      <SearchInput
        value={search}
        placeholder={searchPlaceholder}
        onChange={onSearchChange}
        className="w-[540px]"
      />
      <Button size="small" iconLeft={<Plus />} variant="primary" onClick={onOpenInvite}>
        {inviteLabel}
      </Button>
    </div>
  );
}
