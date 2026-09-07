type NoticeBlockProps = {
  text: string;
  heading?: string;
  variant?: "warning" | "error" | "success" | "info";
  className?: string;
};

const TONE_CLASSES: Record<NonNullable<NoticeBlockProps["variant"]>, string> = {
  warning: "bg-bg-state-base-warning text-text-warning",
  error: "bg-bg-state-base-error text-text-error",
  success: "bg-bg-state-base-success text-text-success",
  info: "bg-bg-surface-base-tertiary text-text-secondary",
};

export function NoticeBlock({ text, heading, variant = "warning", className }: NoticeBlockProps) {
  return (
    <div
      className={`whitespace-pre-line rounded-[20px] p-4 text-note-small ${TONE_CLASSES[variant]} ${className ?? ""}`}
    >
      {heading ? <h3 className="mb-2 text-h3">{heading}</h3> : null}
      {text}
    </div>
  );
}
