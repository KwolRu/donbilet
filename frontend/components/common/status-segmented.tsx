"use client";

import { SegmentedControl } from "@/components/common/segmented-control";

type SegmentValue = "current" | "archived";

export function StatusSegmented({
  value,
  onChange,
}: {
  value: SegmentValue;
  onChange: (value: SegmentValue) => void;
}) {
  return (
    <SegmentedControl
      value={value}
      onChange={onChange}
      options={[
        { value: "current", label: "Текущие" },
        { value: "archived", label: "Архивные" },
      ]}
    />
  );
}
