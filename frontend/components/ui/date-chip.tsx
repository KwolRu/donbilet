interface DateChipProps {
  label: string
  className?: string
  "data-date"?: string
}

export function DateChip({ label, className = "", ...props }: DateChipProps) {
  return (
    <div className="flex justify-center my-3" {...props}>
      <div
        className={[
          "px-4 py-2.5 bg-white rounded-full shadow-card inline-flex justify-center items-center",
          className,
        ].join(" ")}
      >
        <span className="text-text-primary text-sm font-normal leading-4 line-clamp-1">
          {label}
        </span>
      </div>
    </div>
  )
}
