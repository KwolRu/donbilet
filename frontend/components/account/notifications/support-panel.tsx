"use client";

import { useState } from "react";
import { Paperclip, X } from "lucide-react";

import { DbButton } from "@/components/ui/db-button";
import { DbSelectField } from "@/components/ui/db-form-fields";
import { Textarea } from "@/components/ui/textarea";
import { SidePanel } from "@/components/layout-panels/side-panel";
import {
  AttachmentButton,
  AttachmentChips,
  AttachmentHint,
  useAttachments,
} from "./attachments";
import { SUPPORT_MESSAGE_LIMIT, SUPPORT_TOPICS } from "@app/core/mocks/notifications";

/**
 * Обращение в поддержку.
 *
 * Тема — тот же `DbSelectField`, что в карточке пассажира, поле — общий
 * `Textarea`: заводить ради одной формы свои поля значит завести и свои
 * состояния фокуса с ошибкой, которые потом разъедутся с остальными.
 *
 * Вложения — общий механизм `attachments`: несколько файлов, до 10 МБ каждый
 * и до 25 МБ вместе. Проверка здесь, а не только на сервере, — чтобы
 * пользователь узнал о превышении сразу, а не после отправки длинного текста.
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
  onSubmit: (
    topicLabel: string,
    message: string,
    files: { name: string; size: number }[],
  ) => void;
}) {
  const [topic, setTopic] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [wasOpen, setWasOpen] = useState(false);
  const attachments = useAttachments();

  /*
   * Каждое открытие — новое обращение. Сброс во время рендера, а не в эффекте:
   * эффект показал бы первый кадр с прошлым текстом.
   */
  if (open !== wasOpen) {
    setWasOpen(open);

    if (open) {
      setTopic(null);
      setMessage("");
      attachments.clear();
    }
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
            onClick={() =>
              onSubmit(
                topicLabel,
                message.trim(),
                attachments.files.map((file) => ({ name: file.name, size: file.size })),
              )
            }
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

        {/*
         * Вложения: поле-кнопка в стиле остальных полей формы, под ней —
         * выбранные файлы чипами. Кнопка добавляет к списку, а не заменяет
         * его: к обращению обычно прикладывают билет и скриншот, а не
         * что-то одно.
         */}
        <div className="flex flex-col gap-2">
          <AttachmentButton
            attachments={attachments}
            className={
              "squircle flex w-full items-center gap-1 rounded-db-sm bg-db-surface-default px-3 py-2 text-left " +
              "outline outline-1 -outline-offset-1 transition-[outline-color] duration-300 ease-db " +
              "disabled:pointer-events-none disabled:opacity-60 " +
              (attachments.error
                ? "outline-db-border-error"
                : "outline-db-border-default hover:outline-db-border-hover")
            }
          >
            <span className="flex h-8 min-w-0 flex-1 flex-col justify-center px-1">
              <span className="text-db-body text-db-text-tertiary">
                {attachments.files.length === 0 ? "Прикрепить файл" : "Добавить ещё файл"}
              </span>
            </span>

            <Paperclip className="size-4 shrink-0 text-db-text-primary" strokeWidth={1.5} aria-hidden />
          </AttachmentButton>

          <AttachmentChips attachments={attachments} />

          {/*
           * Строка под списком: отказ, счётчик или подсказка. Место под неё
           * держится всегда, иначе кнопки внизу подпрыгивают.
           */}
          <AttachmentHint attachments={attachments} />
        </div>
      </div>
    </SidePanel>
  );
}
