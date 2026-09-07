"use client";

import { useState, useCallback } from "react";
import { X } from "lucide-react";

export type TagInputProps = {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  className?: string;
};

export function TagInput({
  tags,
  onChange,
  placeholder = "Введите тег и нажмите пробел",
  className = "",
}: TagInputProps) {
  const [input, setInput] = useState("");

  const addTag = useCallback(
    (raw: string) => {
      const trimmed = raw.trim();
      if (!trimmed || tags.includes(trimmed)) return;
      onChange([...tags, trimmed]);
      setInput("");
    },
    [tags, onChange],
  );

  const removeTag = useCallback(
    (tag: string) => {
      onChange(tags.filter((t) => t !== tag));
    },
    [tags, onChange],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag(input);
    }
    if (e.key === " ") {
      e.preventDefault();
      addTag(input);
    }
    if (e.key === "Backspace" && input === "" && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  return (
    <div
      className={`self-stretch h-20 p-4 bg-white rounded-[24px] border border-border-subtle inline-flex justify-start items-start gap-2 flex-wrap content-start custom-scrollbar overflow-y-auto focus-within:border-text-link-hover transition-colors ${className}`}
      style={{ cornerShape: "squircle" } as React.CSSProperties}
    >
      {tags.map((tag) => (
        <div
          key={tag}
          className="px-2 py-1 bg-bg-surface-base-primary rounded-full inline-flex justify-center items-center gap-1 shrink-0"
        >
          <div className="text-center justify-start text-text-inverse text-xs font-normal leading-3 line-clamp-1">
            # {tag}
          </div>
          <button
            type="button"
            onClick={() => removeTag(tag)}
            className="flex items-center justify-center text-text-inverse hover:opacity-80"
            aria-label="Удалить тег"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={tags.length === 0 ? placeholder : ""}
        className="flex-1 min-w-[80px] bg-transparent text-text-primary text-base font-normal leading-6 outline-none placeholder:text-text-secondary"
      />
    </div>
  );
}
