"use client";

type ListItemProps = {
  text: string;
  className?: string;
};

export function ListItem({ text, className = "" }: ListItemProps) {
  return (
    <div className={`flex items-start gap-2 ${className}`}>
      <svg width="8" height="20" viewBox="0 0 8 20" fill="none" className="shrink-0">
        <circle cx="4" cy="10" r="4" fill="var(--color-bg-surface-base-base)" />
      </svg>
      <span className="flex-1 text-text-primary text-note-small">{text}</span>
    </div>
  );
}
