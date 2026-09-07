"use client";

import { useRef, useCallback, KeyboardEvent, ClipboardEvent } from "react";

type InputCodeProps = {
  label: string;
  error?: string;
  disabled?: boolean;
  codeLength?: number;
  value?: string;
  onChange?: (value: string) => void;
  name?: string;
};

export function InputCode({
  label,
  error,
  disabled,
  codeLength = 6,
  value = "",
  onChange,
  name,
}: InputCodeProps) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const digits = String(value).padEnd(codeLength, "").slice(0, codeLength).split("");

  const emitChange = useCallback(
    (newDigits: string[]) => {
      onChange?.(newDigits.join(""));
    },
    [onChange],
  );

  const handleInput = (index: number, char: string) => {
    if (!/^\d$/.test(char)) return;
    const next = [...digits];
    next[index] = char;
    emitChange(next);
    if (index < codeLength - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const next = [...digits];
      if (digits[index] && digits[index] !== " ") {
        next[index] = "";
        emitChange(next);
      } else if (index > 0) {
        next[index - 1] = "";
        emitChange(next);
        inputsRef.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < codeLength - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, codeLength);
    if (!pasted) return;
    const next = [...digits];
    for (let i = 0; i < pasted.length; i++) {
      next[i] = pasted[i];
    }
    emitChange(next);
    const focusIdx = Math.min(pasted.length, codeLength - 1);
    inputsRef.current[focusIdx]?.focus();
  };

  return (
    <div className="flex w-full flex-col gap-1">
      <span className={`text-caption-sm ${disabled ? "text-tertiary" : "text-text-primary"}`}>
        {label}
      </span>
      {name && <input type="hidden" name={name} value={String(value)} />}
      <div className="flex gap-4">
        {[0, 1].map((group) => (
          <div key={group} className="flex flex-1 gap-2">
            {Array.from({ length: Math.ceil(codeLength / 2) }).map((_, j) => {
              const i = group * Math.ceil(codeLength / 2) + j;
              if (i >= codeLength) return null;
              const filled = digits[i] && digits[i] !== " ";
              return (
                <div key={i} className="relative flex-1">
                  <input
                    ref={(el) => {
                      inputsRef.current[i] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    disabled={disabled}
                    value={filled ? digits[i] : ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val) handleInput(i, val[val.length - 1]);
                    }}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    onPaste={handlePaste}
                    onFocus={(e) => e.target.select()}
                    className={[
                      "flex h-12 w-full items-center justify-center rounded-full border border-tertiary p-3 text-center font-bold text-[22px] leading-[140%] outline-none",
                      disabled
                        ? "text-tint-foreground border-tint-foreground"
                        : error
                          ? "border-error!  focus:border-error"
                          : "border-subtle text-text-primary focus:border-primary-hover",
                    ].join(" ")}
                    style={{ cornerShape: "squircle" } as React.CSSProperties}
                  />
                  {!filled &&
                    (disabled ? (
                      <div className="w-2 h-2 bg-[#eeeef0] rounded-full pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
                    ) : (
                      <div className="w-2 h-2 bg-dark-grey rounded-full pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
                    ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      {error ? <span className="text-[12px] font-light text-error">{error}</span> : null}
    </div>
  );
}
