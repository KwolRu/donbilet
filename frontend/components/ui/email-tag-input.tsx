"use client";

import { useCallback, useRef, useState } from "react";
import { X } from "lucide-react";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

export type EmailTagInputProps = {
  emails: string[];
  onChange: (emails: string[]) => void;
  placeholder?: string;
  className?: string;
  /**
   * Адреса, которым приглашение уже отправляли: показываются отдельными
   * заблокированными бейджами — их нельзя удалить и нельзя пригласить повторно.
   */
  lockedEmails?: string[];
  lockedHint?: string;
};

/**
 * Поле-бейджи для email-адресатов приглашения. Валидные адреса превращаются в
 * бейджи (Enter / пробел / запятая / потеря фокуса / вставка), невалидные не
 * добавляются и показывают подсказку. Дубликаты игнорируются.
 */
export function EmailTagInput({
  emails,
  onChange,
  placeholder = "Введите email и нажмите Enter",
  className = "",
  lockedEmails = [],
  lockedHint = "Приглашение уже отправлено",
}: EmailTagInputProps) {
  const lockedSet = new Set(lockedEmails.map((email) => email.trim().toLowerCase()));
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Клик по пустой области высокого контейнера должен фокусировать input,
  // а не «проваливаться» мимо однострочного поля, прижатого к верху.
  const focusInputFromContainer = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    e.preventDefault();
    inputRef.current?.focus();
  };

  const commit = useCallback(
    (raw: string): boolean => {
      const value = raw.trim().replace(/,+$/, "").toLowerCase();
      if (!value) return true;
      if (!isValidEmail(value)) {
        setError("Введите корректный email");
        return false;
      }
      if (lockedSet.has(value)) {
        setError(`${lockedHint}: ${value}`);
        return false;
      }
      if (!emails.includes(value)) {
        onChange([...emails, value]);
      }
      setError(null);
      return true;
    },
    // lockedSet пересоздаётся на каждый рендер — сравниваем по исходному списку.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [emails, onChange, lockedEmails, lockedHint],
  );

  const addFromInput = useCallback(() => {
    if (commit(input)) setInput("");
  }, [commit, input]);

  const removeEmail = useCallback(
    (email: string) => {
      onChange(emails.filter((e) => e !== email));
    },
    [emails, onChange],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === " " || e.key === ",") {
      e.preventDefault();
      addFromInput();
      return;
    }
    if (e.key === "Backspace" && input === "" && emails.length > 0) {
      onChange(emails.slice(0, -1));
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text");
    if (!/[\s,;]/.test(pasted)) return;
    e.preventDefault();
    const parts = pasted.split(/[\s,;]+/).filter(Boolean);
    const next = [...emails];
    let hadError = false;
    let hadLocked = false;
    for (const part of parts) {
      const value = part.trim().toLowerCase();
      if (!isValidEmail(value)) {
        hadError = true;
        continue;
      }
      if (lockedSet.has(value)) {
        hadLocked = true;
        continue;
      }
      if (!next.includes(value)) next.push(value);
    }
    onChange(next);
    setError(
      hadError
        ? "Часть адресов пропущена: неверный формат"
        : hadLocked
          ? `Часть адресов пропущена: ${lockedHint.toLowerCase()}`
          : null,
    );
    setInput("");
  };

  return (
    <div className={className}>
      <div
        className="self-stretch h-32 p-3 bg-white rounded-xl outline outline-1 outline-offset-[-1px] outline-border-default flex justify-start items-start gap-2 flex-wrap content-start custom-scrollbar overflow-y-auto focus-within:outline-text-link-hover transition-colors cursor-text"
        onMouseDown={focusInputFromContainer}
      >
        {lockedEmails.map((email) => (
          <div
            key={`locked-${email}`}
            title={lockedHint}
            aria-disabled="true"
            className="px-2 py-1 bg-bg-surface-base-tertiary rounded-full inline-flex justify-center items-center gap-1 shrink-0"
          >
            <span className="text-center text-text-secondary text-xs font-normal leading-3 line-clamp-1">
              {email}
            </span>
          </div>
        ))}
        {emails.map((email) => (
          <div
            key={email}
            className="px-2 py-1 bg-bg-surface-base-primary rounded-full inline-flex justify-center items-center gap-1 shrink-0"
          >
            <span className="text-center text-text-inverse text-xs font-normal leading-3 line-clamp-1">
              {email}
            </span>
            <button
              type="button"
              onClick={() => removeEmail(email)}
              className="flex items-center justify-center text-text-inverse hover:opacity-80"
              aria-label={`Удалить ${email}`}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        <input
          ref={inputRef}
          type="email"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onBlur={addFromInput}
          placeholder={emails.length === 0 && lockedEmails.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[140px] bg-transparent text-text-primary text-base font-normal leading-6 outline-none placeholder:text-text-secondary"
        />
      </div>
      {error ? (
        <span className="mt-1 block text-caption-sm text-text-error">{error}</span>
      ) : null}
    </div>
  );
}
