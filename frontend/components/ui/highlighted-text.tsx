import type { ReactNode } from "react"

interface HighlightedTextProps {
  text: string
  query: string
  /** Стиль выделенного фрагмента */
  markClassName?: string
}

/**
 * Подсвечивает все вхождения query в text через <mark>.
 * Безопасно эскейпит спец-символы regex.
 */
export function HighlightedText({
  text,
  query,
  markClassName = "bg-transparent text-text-link-hover font-semibold",
}: HighlightedTextProps): ReactNode {
  const trimmed = query.trim()
  if (!trimmed) return text

  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const parts = text.split(new RegExp(`(${escaped})`, "gi"))

  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === trimmed.toLowerCase() ? (
          <mark key={i} className={markClassName}>
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  )
}
