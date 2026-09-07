"use client";

import { TextareaHTMLAttributes, useRef, useEffect } from "react";
import resizeHandle from "@/assets/images/common/resize-handle.svg";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  error?: string;
  required?: boolean;
  variant?: "default" | "plain";
};

export function Textarea({
  label,
  error,
  className = "",
  disabled,
  required = false,
  variant = "default",
  ...props
}: TextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const resizeHandleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    const resizeHandle = resizeHandleRef.current;
    if (!textarea || !resizeHandle) return;

    let startY = 0;
    let startHeight = 0;

    const onMouseMove = (e: MouseEvent) => {
      const deltaY = e.clientY - startY;
      const newHeight = Math.max(50, startHeight + deltaY);
      textarea.style.height = `${newHeight}px`;
    };

    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    const onMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      startY = e.clientY;
      startHeight = textarea.offsetHeight;

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    };

    resizeHandle.addEventListener("mousedown", onMouseDown);

    return () => {
      resizeHandle.removeEventListener("mousedown", onMouseDown);
    };
  }, []);

  const isPlain = variant === "plain";

  /* Auto-resize для plain variant */
  useEffect(() => {
    if (!isPlain || !textareaRef.current) return;
    const el = textareaRef.current;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [props.value, isPlain]);

  return (
    <div className="relative w-full">
      <label className="flex w-full flex-col">
        {label ? (
          <span
            className={`text-caption-sm mb-1 ${disabled ? "text-tertiary" : "text-text-primary"}`}
          >
            {label}
            {required ? <span className="text-error"> *</span> : null}
          </span>
        ) : null}

        <div className={isPlain ? undefined : "relative"}>
          <textarea
            ref={textareaRef}
            disabled={disabled}
            aria-invalid={!!error}
            className={[
              isPlain
                ? "w-full resize-none bg-transparent text-base font-normal leading-6 text-text-primary placeholder-text-tertiary outline-none"
                : [
                    "w-full rounded-[24px] border border-border-default bg-surface p-3 text-input-lg outline-none transition-colors",
                    "placeholder:text-tint-foreground",
                    "resize-none",
                    disabled
                      ? "text-tint-foreground border-tint-foreground"
                      : error
                        ? "border-error text-error focus-within:border-error"
                        : "border-border-default text-text-primary focus-within:border-primary-hover",
                  ].join(" "),
              className,
            ].join(" ")}
            {...props}
            style={isPlain ? undefined : ({ cornerShape: "squircle" } as React.CSSProperties)}
          />

          {!isPlain && (
            <div
              ref={resizeHandleRef}
              className={`
                absolute
                w-5 h-5
                cursor-n-resize
                flex items-center justify-center
                transition-colors
                ${disabled ? "hidden" : ""}
              `}
              style={{
                bottom: "12px",
                right: "8px",
              }}
            >
              <img src={resizeHandle.src ?? resizeHandle} alt="Resize handle" />
            </div>
          )}
        </div>

        {error ? <span className="text-[12px] font-light text-error">{error}</span> : null}
      </label>
    </div>
  );
}
