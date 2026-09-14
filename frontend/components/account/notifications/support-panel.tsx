"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Paperclip, X } from "lucide-react";

import { DbButton } from "@/components/ui/db-button";
import { DbSelectField } from "@/components/ui/db-form-fields";
import { Textarea } from "@/components/ui/textarea";
import { SidePanel } from "@/components/layout-panels/side-panel";
import {
  ATTACHMENT_ACCEPT,
  ATTACHMENT_MAX_BYTES,
  SUPPORT_MESSAGE_LIMIT,
  SUPPORT_TOPICS,
  formatFileSize,
} from "@app/core/mocks/notifications";

/**
 * Обращение в поддержку.
 *
 * Тема — тот же `DbSelectField`, что в карточке пассажира, поле — общий
 * `Textarea`: заводить ради одной формы свои поля значит завести и свои
 * состояния фокуса с ошибкой, которые потом разъедутся с остальными.
 *
 * Вложение: одно, до 10 МБ, из перечисленных форматов. Проверка здесь, а не
 * только на сервере, — чтобы пользователь узнал о превышении сразу, а не
 * после отправки длинного текста.
 *
 * Кнопка «Отправить» заблокирована, пока нет темы и сообщения: пустое
 * обращение бессмысленно, и это состояние `disabled` из макета.
 */
export function SupportPanel({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (topicLabel: string, message: string) => void;
}) {
  const [topic, setTopic] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [wasOpen, setWasOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const reduced = useReducedMotion();

  /*
   * Каждое открытие — новое обращение. Сброс во время рендера, а не в эффекте:
   * эффект показал бы первый кадр с прошлым текстом.
   */
  if (open !== wasOpen) {
    setWasOpen(open);

    if (open) {
      setTopic(null);
      setMessage("");
      setFile(null);
      setFileError(null);
    }
  }

  function pickFile(next: File | undefined) {
    if (!next) return;

    if (next.size > ATTACHMENT_MAX_BYTES) {
      setFileError(`Файл больше 10 МБ — ${formatFileSize(next.size)}`);
      setFile(null);
      return;
    }

    setFileError(null);
    setFile(next);
  }

  const topicLabel = SUPPORT_TOPICS.find((item) => item.value === topic)?.label ?? "";
  const ready = Boolean(topic) && message.trim().length > 0;

  return (
    <SidePanel
      open={open}
      onClose={onClose}
      className="!p-0"
      header={
        <div className="flex flex-col items-end gap-4 px-6 pt-6 pb-4">
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="transition-[opacity,transform] duration-300 ease-db hover:rotate-90 hover:opacity-60"
          >
            <X className="size-6 text-db-text-primary" strokeWidth={2} aria-hidden />
          </button>

          <h2 className="w-full text-db-subsection font-medium text-db-text-primary">
            Обращение в поддержку
          </h2>
        </div>
      }
      footer={
        <div className="flex gap-3 px-6 pt-0 pb-6">
          <DbButton variant="lianer" size="large" fullWidth onClick={onClose}>
            Отмена
          </DbButton>

          <DbButton
            variant="primary"
            size="large"
            fullWidth
            disabled={!ready}
            onClick={() => onSubmit(topicLabel, message.trim())}
          >
            Отправить
          </DbButton>
        </div>
      }
    >
      <div className="flex flex-col gap-4 px-6 pb-6">
        <DbSelectField
          label="Тема обращения"
          value={topic}
          options={[...SUPPORT_TOPICS]}
          onChange={setTopic}
          placeholder="Выберите тему"
        />

        <div className="relative">
          <Textarea
            label="Сообщение"
            value={message}
            maxLength={SUPPORT_MESSAGE_LIMIT}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Опишите, что случилось"
            className="h-72"
          />

          {/* Счётчик из макета. Абсолютом, чтобы не раздвигать поле и не
              сдвигать всё, что ниже, когда он появляется. */}
          <span className="pointer-events-none absolute right-4 bottom-3 text-db-micro text-db-text-secondary">
            {message.length}/{SUPPORT_MESSAGE_LIMIT}
          </span>
        </div>

        {/* Вложение: поле-кнопка в стиле остальных полей формы. */}
        <div className="flex flex-col gap-2">
          <input
            ref={fileRef}
            type="file"
            accept={ATTACHMENT_ACCEPT}
            className="sr-only"
            onChange={(event) => pickFile(event.target.files?.[0])}
          />

          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className={
              "squircle flex w-full items-center gap-1 rounded-db-sm bg-db-surface-default px-3 py-2 text-left " +
              "outline outline-1 -outline-offset-1 transition-[outline-color] duration-300 ease-db " +
              (fileError ? "outline-db-border-error" : "outline-db-border-default hover:outline-db-border-hover")
            }
          >
            <span className="flex h-8 min-w-0 flex-1 flex-col justify-center px-1">
              {file ? (
                <>
                  <span className="text-db-micro text-db-text-secondary">Файл</span>
                  <span className="truncate text-db-body text-db-text-primary">
                    {file.name} · {formatFileSize(file.size)}
                  </span>
                </>
              ) : (
                <span className="text-db-body text-db-text-tertiary">Прикрепить файл</span>
              )}
            </span>

            <Paperclip className="size-4 shrink-0 text-db-text-primary" strokeWidth={1.5} aria-hidden />
          </button>

          {/*
           * Подсказка и ошибка занимают одну строку и сменяют друг друга —
           * место под них держится всегда, иначе кнопки внизу подпрыгивают.
           */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={fileError ?? (file ? "attached" : "hint")}
              initial={reduced ? false : { opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? undefined : { opacity: 0, y: 4 }}
              transition={{ duration: reduced ? 0 : 0.18 }}
              className={
                "px-1 text-db-micro " +
                (fileError ? "text-db-text-error" : "text-db-text-secondary")
              }
            >
              {fileError ?? (file ? "Файл прикреплён" : "PDF, PNG или JPG, до 10 МБ")}
            </motion.span>
          </AnimatePresence>

          {file && (
            <button
              type="button"
              onClick={() => setFile(null)}
              className="self-start px-1 text-db-micro text-db-text-secondary underline transition-colors duration-300 ease-db hover:text-db-text-primary"
            >
              Убрать файл
            </button>
          )}
        </div>
      </div>
    </SidePanel>
  );
}
