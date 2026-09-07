"use client";

import {
  ChangeEvent,
  InputHTMLAttributes,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { EyeClosed, Eye, ArrowUpRight } from "lucide-react";
import { useMergedRef } from "@app/core/hooks/useMergedRef";
type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & {
  label?: string;
  error?: string;
  required?: boolean;
  prefix?: string;
  suffix?: ReactNode;
  inputClassName?: string;
  suffixMode?: "edge" | "inline";
  inlineSuffixAlwaysVisible?: boolean;
  numericOnly?: boolean;
  showLinkIcon?: boolean;
};

export function Input({
  label,
  error,
  className = "",
  disabled,
  type,
  required = false,
  prefix,
  suffix,
  inputClassName = "",
  suffixMode = "edge",
  inlineSuffixAlwaysVisible = false,
  numericOnly = false,
  showLinkIcon = false,
  onChange,
  value,
  defaultValue,
  ...props
}: InputProps) {
  const { ref: externalRef, ...restProps } = props as InputProps & {
    ref?: ((instance: HTMLInputElement | null) => void) | { current: HTMLInputElement | null };
  };
  const isPassword = type === "password";
  const [showPassword, setShowPassword] = useState(false);
  const prefixRef = useRef<HTMLSpanElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const setInputRef = useMergedRef(externalRef, inputRef);
  const [prefixWidth, setPrefixWidth] = useState(0);
  const [uncontrolledValue, setUncontrolledValue] = useState(() => {
    if (typeof defaultValue === "string" || typeof defaultValue === "number") {
      return String(defaultValue);
    }
    return "";
  });
  const rawValue = useMemo(() => {
    if (typeof value === "string" || typeof value === "number") return String(value);
    return uncontrolledValue;
  }, [uncontrolledValue, value]);

  // Держим внутреннее значение в курсе контролируемого `value`, чтобы при
  // переходе controlled → uncontrolled поле не откатилось к старому тексту.
  // Синхронизация во время рендера, а не в эффекте: лишний проход тут виден
  // как мигание значения при программной установке.
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    if (typeof value === "string" || typeof value === "number") {
      setUncontrolledValue(String(value));
    }
  }

  // Autofill браузера меняет DOM-значение молча, без событий React. Сверяем
  // после каждого коммита, иначе поле «пустое» для формы, но заполнено на экране.
  useEffect(() => {
    if (typeof value !== "undefined") return;
    const domValue = inputRef.current?.value;
    if (typeof domValue === "string" && domValue !== uncontrolledValue) {
      setUncontrolledValue(domValue);
    }
  }, [value, uncontrolledValue]);

  useEffect(() => {
    setPrefixWidth(prefixRef.current?.offsetWidth ?? 0);
  }, [prefix]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!numericOnly) {
      if (typeof value === "undefined") {
        setUncontrolledValue(event.target.value);
      }
      onChange?.(event);
      return;
    }
    const sanitized = event.target.value.replace(/[^\d]/g, "");
    if (sanitized !== event.target.value) {
      event.target.value = sanitized;
    }
    if (typeof value === "undefined") {
      setUncontrolledValue(event.target.value);
    }
    onChange?.(event);
  };

  const handleInput = (event: React.FormEvent<HTMLInputElement>) => {
    const inputValue = event.currentTarget.value;

    // Синхронизируем uncontrolled value при autofill
    if (typeof value === "undefined" && inputValue !== uncontrolledValue) {
      setUncontrolledValue(inputValue);
    }

    // При autofill браузер вызывает input, но не change — имитируем change
    // для react-hook-form и других обработчиков
    if (onChange && inputValue !== rawValue) {
      const syntheticEvent = Object.create(event);
      syntheticEvent.type = "change";
      syntheticEvent.target = event.currentTarget;
      syntheticEvent.currentTarget = event.currentTarget;
      onChange(syntheticEvent as ChangeEvent<HTMLInputElement>);
    }

    // React типизирует onInput как InputEvent, но обработчик у <input> получает
    // FormEvent — приводим явно, чтобы прокинуть внешний onInput без потери типов.
    restProps.onInput?.(event as React.InputEvent<HTMLInputElement>);
  };

  return (
    <div className="flex flex-col">
      {label ? (
        <span
          className={`text-caption-sm ${disabled ? "text-tertiary" : "text-text-primary"} mb-1`}
        >
          {label}
          {required && <span className="text-error"> *</span>}
        </span>
      ) : null}
      <div
        className={[
          "relative flex items-center h-12 w-full rounded-full border border-border-default bg-surface text-input-lg outline-none transition-colors overflow-hidden",
          disabled
            ? "text-tint-foreground border-border-default"
            : error
              ? "border-error text-error focus-within:border-error"
              : "border-border-default text-text-primary focus-within:border-primary-hover",
          className,
        ].join(" ")}
        style={{ cornerShape: "squircle" } as React.CSSProperties}
      >
        {prefix && (
          <span ref={prefixRef} className="pl-3 text-tint-foreground whitespace-nowrap select-none">
            {prefix}
          </span>
        )}
        <input
          ref={setInputRef}
          disabled={disabled}
          type={isPassword && showPassword ? "text" : type}
          aria-invalid={!!error}
          inputMode={numericOnly ? "numeric" : restProps.inputMode}
          pattern={numericOnly ? "[0-9]*" : restProps.pattern}
          className={[
            "h-full w-full bg-transparent outline-none",
            "placeholder:text-tint-foreground",
            prefix ? "pl-0" : "pl-3",
            suffix && suffixMode === "edge" ? "pr-0" : isPassword ? "pr-10" : "pr-3",
            inputClassName,
          ].join(" ")}
          value={value}
          defaultValue={typeof value === "undefined" ? defaultValue : undefined}
          onChange={handleChange}
          onInput={handleInput}
          {...restProps}
        />
        {suffix && suffixMode === "edge" && (
          <span className="pr-3 text-tint-foreground whitespace-nowrap select-none">{suffix}</span>
        )}
        {suffix &&
          suffixMode === "inline" &&
          (inlineSuffixAlwaysVisible || rawValue.length > 0) && (
            <span
              className="pointer-events-none absolute inset-y-0 flex items-center"
              style={{ left: prefix ? `${prefixWidth + 2}px` : "12px" }}
            >
              <span className="invisible text-input-lg whitespace-pre">{rawValue}</span>
              <span className="text-input-lg text-text-primary whitespace-nowrap">{suffix}</span>
            </span>
          )}
        {isPassword && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 text-tint-foreground hover:text-text-primary transition-colors"
          >
            {showPassword ? <EyeClosed className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
          </button>
        )}
        {showLinkIcon && !isPassword && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6 text-tint-foreground pointer-events-none">
            <ArrowUpRight className="w-4 h-4" />
          </span>
        )}
      </div>
      {error ? <span className="text-[12px] font-light text-error">{error}</span> : null}
    </div>
  );
}
