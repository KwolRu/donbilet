"use client";

import { Input } from "@/components/ui/input";

type Props = {
  label: string;
  fromValue?: number;
  toValue?: number;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  suffix?: string;
  suffixMode?: "inline";
};

/** Диапазон «От — До» с одним лейблом, как «Остаток баланса» в фильтре учеников. */
export function FilterRangeField({
  label,
  fromValue,
  toValue,
  onFromChange,
  onToChange,
  suffix,
  suffixMode,
}: Props) {
  return (
    <div className="space-y-2">
      <div className="flex items-end gap-3">
        <Input
          label={label}
          placeholder="От"
          value={fromValue?.toString() ?? ""}
          onChange={(event) => onFromChange(event.target.value)}
          suffix={suffix}
          suffixMode={suffixMode}
          numericOnly
        />
        <span className="pb-3 text-text-tertiary">-</span>
        <Input
          label=" "
          placeholder="До"
          value={toValue?.toString() ?? ""}
          onChange={(event) => onToChange(event.target.value)}
          suffix={suffix}
          suffixMode={suffixMode}
          numericOnly
        />
      </div>
    </div>
  );
}
