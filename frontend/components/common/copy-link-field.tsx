"use client";

import { useState } from "react";
import { Copy } from "lucide-react";
import { Input } from "@/components/ui/input";

type CopyLinkFieldProps = {
  label: string;
  value: string;
  copiedText?: string;
  disabled?: boolean;
};

export function CopyLinkField({
  label,
  value,
  copiedText = "Ссылка скопирована",
  disabled = false,
}: CopyLinkFieldProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!value || disabled) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <Input
        label={label}
        value={value}
        readOnly
        disabled={disabled}
        suffix={
          <button
            type="button"
            onClick={() => void handleCopy()}
            className="inline-flex items-center justify-center text-icon-primary transition-colors hover:text-icon-hover disabled:cursor-not-allowed disabled:text-icon-disabled"
            aria-label="Скопировать ссылку"
            disabled={!value || disabled}
          >
            <Copy className="mt-2 size-5" aria-hidden="true" />
          </button>
        }
      />
      {copied ? <span className="text-caption-sm text-text-success">{copiedText}</span> : null}
    </div>
  );
}
