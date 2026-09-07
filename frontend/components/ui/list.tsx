"use client";

import { ListItem } from "./list-item";

type ListProps = {
  items: string[];
  className?: string;
};

export function List({ items, className = "" }: ListProps) {
  if (items.length === 0) return null;
  return (
    <div className={`self-stretch flex flex-col gap-1 ${className}`}>
      {items.map((item) => (
        <ListItem key={item} text={item} />
      ))}
    </div>
  );
}
