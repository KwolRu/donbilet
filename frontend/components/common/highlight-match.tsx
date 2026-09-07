"use client";

type Props = {
  text: string;
  query?: string;
  className?: string;
  highlightClassName?: string;
};

export function HighlightMatch({
  text,
  query,
  className,
  highlightClassName = "bg-bg-state-base-warning",
}: Props) {
  const normalizedQuery = query?.trim();
  if (!normalizedQuery) return <span className={className}>{text}</span>;

  const regex = new RegExp(`(${escapeRegExp(normalizedQuery)})`, "ig");
  const parts = text.split(regex);

  return (
    <span className={className}>
      {parts.map((part, index) =>
        part.toLowerCase() === normalizedQuery.toLowerCase() ? (
          <span key={`${part}-${index}`} className={highlightClassName}>
            {part}
          </span>
        ) : (
          <span key={`${part}-${index}`}>{part}</span>
        ),
      )}
    </span>
  );
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
