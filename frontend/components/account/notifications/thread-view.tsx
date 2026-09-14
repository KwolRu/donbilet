"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CheckCheck, Info, Paperclip, Send } from "lucide-react";

import { AttachmentButton, AttachmentChips, useAttachments } from "./attachments";
import { EmptyChatArt } from "./empty-chat-art";
import { MessageAttachments } from "./message-attachments";
import {
  attachmentKindOf,
  type ChatMessage,
  type NotificationThread,
} from "@app/core/mocks/notifications";

/**
 * Правая часть раздела: переписка по выбранному уведомлению.
 *
 * Прокручивается только лента сообщений. Это важнее, чем кажется: если
 * прокручивать всю область, вместе с сообщениями уезжают дата-разделитель и
 * поле ввода — а поле ввода должно быть под рукой всегда.
 *
 * Системное уведомление вместо поля ввода показывает плашку: отвечать на него
 * некому, и пустая строка ввода обещала бы ответ, которого не будет.
 */
export function ThreadView({ thread }: { thread: NotificationThread | null }) {
  const reduced = useReducedMotion();
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const attachments = useAttachments();
  const feedRef = useRef<HTMLDivElement>(null);

  /*
   * Смена уведомления — новая переписка: черновик и вложение от прошлой здесь
   * были бы чужими. Сброс во время рендера, а не в эффекте: эффект отрисовал
   * бы кадр с сообщениями прошлого чата и только потом подменил их.
   */
  const [shownId, setShownId] = useState<number | null>(null);
  const threadId = thread?.id ?? null;

  if (threadId !== shownId) {
    setShownId(threadId);
    setMessages(thread?.messages ?? []);
    setDraft("");
    attachments.clear();
  }

  // Лента всегда показывает последнее сообщение — как в любом мессенджере.
  useEffect(() => {
    const feed = feedRef.current;
    if (!feed) return;
    feed.scrollTo({ top: feed.scrollHeight, behavior: reduced ? "auto" : "smooth" });
  }, [messages, reduced]);

  function send() {
    const text = draft.trim();
    if (!text && attachments.files.length === 0) return;

    setMessages((current) => [
      ...current,
      {
        id: (current.at(-1)?.id ?? 0) + 1,
        author: "me",
        text,
        /*
         * Вложения уходят отдельным полем, а не строкой в тексте: в сообщении
         * они рисуются превью, и разбирать их обратно из текста было бы
         * выдумыванием формата на ровном месте.
         *
         * `blob:`-ссылка — чтобы отправленное фото или видео сразу было видно
         * в переписке. Настоящий адрес придёт с сервера вместе с ответом на
         * загрузку и заменит эту ссылку (блокер B1).
         */
        attachments: attachments.files.map((file) => {
          const kind = attachmentKindOf(file.type);

          return {
            name: file.name,
            size: file.size,
            kind,
            url: kind === "file" ? undefined : URL.createObjectURL(file),
          };
        }),
        time: new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(
          new Date(),
        ),
        read: false,
      },
    ]);
    setDraft("");
    attachments.clear();
  }

  if (!thread) {
    return (
      <div className="squircle flex flex-1 flex-col items-center justify-center gap-6 rounded-db-md p-4 outline outline-1 -outline-offset-1 outline-db-border-subtle">
        <motion.div
          key="empty"
          initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: reduced ? 0 : 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-center gap-6"
        >
          <EmptyChatArt />
          <p className="max-w-96 text-center text-db-subsection font-medium text-db-text-primary">
            Выберите чат,
            <br />
            чтобы начать переписку
          </p>
        </motion.div>
      </div>
    );
  }

  const answerable = thread.kind === "ticket";

  return (
    /*
     * `key` по уведомлению перемонтирует переписку: содержимое проявляется
     * мягко, вместо того чтобы подмениться кадром. Ключ здесь уместен именно
     * потому, что при смене чата меняется всё — и лента, и черновик, и
     * состояние вложений.
     */
    <motion.div
      key={thread.id}
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0 : 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="squircle flex min-w-0 flex-1 flex-col gap-6 rounded-db-md p-4 outline outline-1 -outline-offset-1 outline-db-border-subtle"
    >
      <span className="shrink-0 text-center text-db-caption text-db-text-secondary">
        {thread.date}
      </span>

      {/* Единственная прокручиваемая область раздела. */}
      <div ref={feedRef} className="db-scrollbar flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              layout={!reduced}
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: reduced ? 0 : 0.26, ease: [0.22, 1, 0.36, 1] }}
              className={"flex " + (message.author === "me" ? "justify-end" : "justify-start")}
            >
              <div className="squircle flex w-[632px] max-w-full flex-col gap-1 rounded-db-sm bg-db-surface-muted p-3">
                {message.title && (
                  <span className="text-db-item font-medium text-db-text-primary">
                    {message.title}
                  </span>
                )}

                {message.text && (
                  <p className="text-db-caption leading-5 whitespace-pre-line text-db-text-primary">
                    {message.text}
                  </p>
                )}

                {message.attachments && message.attachments.length > 0 && (
                  <MessageAttachments items={message.attachments} />
                )}

                <span className="flex items-center justify-end gap-1 text-db-caption text-db-text-secondary">
                  {message.author === "me" && (
                    <CheckCheck
                      className={"size-4 " + (message.read ? "text-text-info" : "text-db-text-tertiary")}
                      strokeWidth={1.5}
                      aria-label={message.read ? "Прочитано" : "Отправлено"}
                    />
                  )}
                  {message.time}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {answerable ? (
        <div className="shrink-0">
          {/* Вложения живут над строкой ввода: в самой строке для них нет
              места, а прятать выбранное нельзя — оно уже выбрано. */}
          <AttachmentChips attachments={attachments} className="mb-2" />

          <AnimatePresence>
            {attachments.error && (
              <motion.p
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, y: 4 }}
                transition={{ duration: reduced ? 0 : 0.18 }}
                className="mb-2 px-1 text-db-micro text-db-text-error"
              >
                {attachments.error}
              </motion.p>
            )}
          </AnimatePresence>

          <div className="squircle flex items-center gap-4 rounded-db-sm bg-db-surface-default py-3 pr-3 pl-4 outline outline-1 -outline-offset-1 outline-db-border-default transition-[outline-color] duration-300 ease-db focus-within:outline-db-border-hover">
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  send();
                }
              }}
              placeholder="Введите сообщение"
              aria-label="Введите сообщение"
              className="min-w-0 flex-1 bg-transparent text-db-article text-db-text-primary outline-none placeholder:text-db-text-tertiary"
            />

            <div className="flex shrink-0 items-center gap-1">
              <AttachmentButton
                attachments={attachments}
                className="squircle flex size-10 items-center justify-center rounded-db-sm bg-db-surface-muted transition-[filter,transform,opacity] duration-300 ease-db hover:brightness-95 active:scale-95 disabled:pointer-events-none disabled:opacity-40"
              >
                <Paperclip className="size-4 text-db-text-secondary" strokeWidth={1.5} aria-hidden />
              </AttachmentButton>

              <button
                type="button"
                onClick={send}
                disabled={!draft.trim() && attachments.files.length === 0}
                aria-label="Отправить сообщение"
                className="squircle flex size-10 items-center justify-center rounded-db-sm bg-db-button-primary-bg transition-[filter,transform,opacity] duration-300 ease-db hover:brightness-95 active:scale-95 disabled:pointer-events-none disabled:bg-db-surface-muted"
              >
                <Send className="size-4 text-db-text-primary" strokeWidth={1.5} aria-hidden />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="squircle flex shrink-0 items-center gap-4 rounded-db-md bg-bg-surface-base-elevated p-4 outline outline-1 -outline-offset-1 outline-db-border-hover">
          <span className="squircle flex size-10 shrink-0 items-center justify-center rounded-db-xs bg-db-surface-base">
            <Info className="size-5 text-db-text-primary" strokeWidth={2} aria-hidden />
          </span>

          <p className="text-db-caption leading-5 text-db-text-secondary">
            Это информационное сообщение. Ответить на него нельзя. Для вопросов и дополнительной
            информации обратитесь в раздел «Поддержка».
          </p>
        </div>
      )}
    </motion.div>
  );
}
