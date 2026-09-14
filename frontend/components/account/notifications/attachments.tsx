"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Paperclip, X } from "lucide-react";

import {
  ATTACHMENTS_MAX_COUNT,
  ATTACHMENTS_MAX_TOTAL_BYTES,
  ATTACHMENT_ACCEPT,
  ATTACHMENT_MAX_BYTES,
  formatFileSize,
} from "@app/core/mocks/notifications";

/**
 * Вложения: выбор нескольких файлов, чипы и проверки.
 *
 * Один механизм на оба места, где прикрепляют файлы, — строку чата и форму
 * обращения. Разводить их нельзя: правила у вложений одни, а две копии
 * проверок разъезжаются на первой же правке лимита.
 *
 * Что здесь решается, кроме «выбрать файл»:
 *   выбор добавляется к уже выбранному, а не заменяет его — иначе второй
 *   поход в диалог стирает первый;
 *   повтор того же файла (имя и размер совпали) отбрасывается молча — это
 *   не ошибка пользователя, а промах мышью;
 *   отказы объясняются поимённо: «файл Х больше 10 МБ» полезнее, чем
 *   «ошибка вложения».
 *
 * Свой `value` у `input[type=file]` сбрасывается после каждого выбора: без
 * этого повторный выбор того же файла не вызывает `change`, и пользователь
 * решает, что кнопка сломалась.
 */

export type AttachmentsApi = {
  files: File[];
  error: string | null;
  /** Полон ли список — кнопка выбора в этом состоянии блокируется. */
  full: boolean;
  add: (incoming: FileList | null) => void;
  remove: (file: File) => void;
  clear: () => void;
};

export function useAttachments(): AttachmentsApi {
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  function add(incoming: FileList | null) {
    if (!incoming || incoming.length === 0) return;

    const rejected: string[] = [];
    const next = [...files];

    for (const file of Array.from(incoming)) {
      const duplicate = next.some(
        (item) => item.name === file.name && item.size === file.size,
      );
      if (duplicate) continue;

      if (file.size > ATTACHMENT_MAX_BYTES) {
        rejected.push(`${file.name} — больше 10 МБ`);
        continue;
      }

      if (next.length >= ATTACHMENTS_MAX_COUNT) {
        rejected.push(`${file.name} — больше ${ATTACHMENTS_MAX_COUNT} файлов нельзя`);
        continue;
      }

      const total = next.reduce((sum, item) => sum + item.size, file.size);
      if (total > ATTACHMENTS_MAX_TOTAL_BYTES) {
        rejected.push(`${file.name} — вместе получается больше 25 МБ`);
        continue;
      }

      next.push(file);
    }

    setFiles(next);
    setError(rejected.length ? rejected.join("; ") : null);
  }

  function remove(file: File) {
    setFiles((current) => current.filter((item) => item !== file));
    setError(null);
  }

  function clear() {
    setFiles([]);
    setError(null);
  }

  return { files, error, full: files.length >= ATTACHMENTS_MAX_COUNT, add, remove, clear };
}

/** Кнопка выбора файлов вместе со скрытым `input`. */
export function AttachmentButton({
  attachments,
  className,
  label = "Прикрепить файл",
  children,
}: {
  attachments: AttachmentsApi;
  className?: string;
  label?: string;
  children?: React.ReactNode;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ATTACHMENT_ACCEPT}
        className="sr-only"
        onChange={(event) => {
          attachments.add(event.target.files);
          // Сброс, иначе повторный выбор того же файла не вызовет `change`.
          event.target.value = "";
        }}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={attachments.full}
        aria-label={label}
        title={attachments.full ? `Больше ${ATTACHMENTS_MAX_COUNT} файлов нельзя` : undefined}
        className={className}
      >
        {children ?? <Paperclip className="size-4" strokeWidth={1.5} aria-hidden />}
      </button>
    </>
  );
}

/** Список выбранных файлов чипами. Пустой — ничего не рисует. */
export function AttachmentChips({
  attachments,
  className = "",
}: {
  attachments: AttachmentsApi;
  className?: string;
}) {
  const reduced = useReducedMotion();

  if (attachments.files.length === 0) return null;

  return (
    <ul className={"flex flex-wrap items-center gap-2 " + className}>
      <AnimatePresence initial={false} mode="popLayout">
        {attachments.files.map((file) => (
          <motion.li
            key={`${file.name}-${file.size}`}
            layout={!reduced}
            initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
            transition={{ duration: reduced ? 0 : 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="squircle flex max-w-full items-center gap-2 rounded-db-xs bg-db-surface-muted py-2 pr-2 pl-3"
          >
            <Paperclip className="size-4 shrink-0 text-db-text-secondary" strokeWidth={1.5} aria-hidden />

            <span className="truncate text-db-caption text-db-text-primary">{file.name}</span>
            <span className="shrink-0 text-db-caption text-db-text-tertiary">
              {formatFileSize(file.size)}
            </span>

            <button
              type="button"
              onClick={() => attachments.remove(file)}
              aria-label={`Убрать файл ${file.name}`}
              className="flex size-5 shrink-0 items-center justify-center rounded-full text-db-text-tertiary transition-colors duration-300 ease-db hover:bg-db-surface-default hover:text-db-text-primary"
            >
              <X className="size-3.5" strokeWidth={2} aria-hidden />
            </button>
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}

/**
 * Строка под выбором файлов: отказ, счётчик или подсказка.
 *
 * Место под неё держится всегда — иначе кнопки формы подпрыгивают, стоит
 * появиться ошибке.
 */
export function AttachmentHint({ attachments }: { attachments: AttachmentsApi }) {
  const reduced = useReducedMotion();

  const text = attachments.error
    ? attachments.error
    : attachments.files.length > 0
      ? `${attachments.files.length} из ${ATTACHMENTS_MAX_COUNT} файлов · ${formatFileSize(
          attachments.files.reduce((sum, file) => sum + file.size, 0),
        )}`
      : "PDF, изображение или документ — до 10 МБ каждый";

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.span
        key={text}
        initial={reduced ? false : { opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduced ? undefined : { opacity: 0, y: 4 }}
        transition={{ duration: reduced ? 0 : 0.18 }}
        className={
          "block px-1 text-db-micro " +
          (attachments.error ? "text-db-text-error" : "text-db-text-secondary")
        }
      >
        {text}
      </motion.span>
    </AnimatePresence>
  );
}
