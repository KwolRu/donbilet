"use client"

import { useIMask } from "react-imask"
import { useEffect } from "react"

type PhoneInputProps = {
  label: string
  error?: string
  disabled?: boolean
  className?: string
  placeholder?: string
  value?: string
  onChange?: (value: string) => void
  onBlur?: () => void
  name?: string
  hideLabel?: boolean
  autoFocus?: boolean
  autoComplete?: string
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>
}

export function PhoneInput({
  label,
  error,
  disabled,
  className = "",
  placeholder = "+7 (___) ___-__-__",
  value,
  onChange,
  onBlur,
  name,
  hideLabel = false,
  autoFocus,
  autoComplete = "tel",
  onKeyDown,
}: PhoneInputProps) {
  const { ref, setUnmaskedValue } = useIMask(
    {
      mask: "+{7} (000) 000-00-00",
      lazy: true,
    },
    {
      onAccept: (_val: string, mask) => {
        const unmasked = mask.unmaskedValue
        if (unmasked.length === 0) {
          onChange?.("")
        } else {
          onChange?.(`+${unmasked}`)
        }
      },
    },
  )

  useEffect(() => {
    setUnmaskedValue(value ? value.replace(/^\+/, "") : "")
  }, [value, setUnmaskedValue])

  return (
    <label className="flex w-full flex-col gap-1">
      <span
        className={`${hideLabel ? "sr-only" : "text-caption-sm"} ${
          disabled ? "text-tertiary" : "text-text-primary"
        }`}
      >
        {label}
      </span>
      <input
        ref={ref as React.Ref<HTMLInputElement>}
        type="tel"
        name={name}
        autoFocus={autoFocus}
        autoComplete={autoComplete}
        inputMode="tel"
        disabled={disabled}
        placeholder={placeholder}
        aria-invalid={!!error}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        className={[
          "h-12 w-full rounded-full border border-tertiary bg-surface p-3 text-input-lg outline-none transition-colors",
          "placeholder:text-tint-foreground",
          disabled
            ? "text-tint-foreground border-tint-foreground"
            : error
              ? "border-error text-error focus:border-error"
              : "border-subtle text-text-primary focus:border-primary-hover",
          className,
        ].join(" ")}
        style={{ cornerShape: "squircle" } as React.CSSProperties}
      />
      {error ? <span className="text-[12px] font-light text-error">{error}</span> : null}
    </label>
  )
}
