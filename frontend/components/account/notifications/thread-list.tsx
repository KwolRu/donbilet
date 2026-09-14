"use client";

import { Search, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import type { NotificationThread } from "@app/core/mocks/notifications";

/**
 * Колонка уведомлений: поиск и список.
 *
 * Три состояния строки из макета и все три — про данные, а не про оформление:
 *   непрочитанное — жёлтая подложка `elevated`;
 *   выбранное     — серая подложка, чтобы было видно, что читаешь;
 *   прочее        — белое с обводкой.
 * Выбранное и непрочитанное могут совпасть: открытое уведомление гасит
 * жёлтый, но подсветку выбора оставляет.
 *
 * Прокручивается только список — поиск остаётся на месте, иначе он уезжает
 * из виду на первой же прокрутке.
 */
export function ThreadList({
  threads,
  activeId,
  query,
  onQueryChange,
  onSelect,
}: {
  threads: NotificationThread[];
  activeId: number | null;
  query: string;
  onQueryChange: (next: string) => void;
  onSelect: (thread: NotificationThread) => void;
}) {
  const reduced = useReducedMotion();

  return (
    <div className="flex w-[384px] shrink-0 flex-col gap-4">
      <label className="group squircle flex h-10 shrink-0 items-center gap-2 rounded-db-sm bg-db-surface-default px-3 outline outline-1 -outline-offset-1 outline-db-border-subtle transition-[outline-color] duration-300 ease-db focus-within:outline-db-border-hover">
        <Search
          className={
            "size-4 shrink-0 transition-colors duration-300 ease-db " +
            (query
              ? "text-db-text-primary"
              : "text-db-text-tertiary group-focus-within:text-db-text-primary")
          }
          strokeWidth={1.5}
          aria-hidden
        />
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Поиск"
          aria-label="Поиск по уведомлениям"
          className="w-full bg-transparent text-db-body font-medium text-db-text-primary outline-none placeholder:text-db-text-tertiary"
        />
        {/* Крестик в разметке всегда — иначе поле дёргается на первом символе. */}
        <button
          type="button"
          onClick={() => onQueryChange("")}
          aria-label="Очистить поиск"
          tabIndex={query ? 0 : -1}
          className={
            "flex size-5 shrink-0 items-center justify-center rounded-full text-db-text-tertiary transition-[opacity,color,transform] duration-300 ease-db hover:text-db-text-primary " +
            (query ? "opacity-100" : "pointer-events-none scale-75 opacity-0")
          }
        >
          <X className="size-4" strokeWidth={1.5} aria-hidden />
        </button>
      </label>

      <ul className="db-scrollbar flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
        <AnimatePresence initial={false} mode="popLayout">
          {threads.map((thread) => {
            const active = thread.id === activeId;

            return (
              <motion.li
                key={thread.id}
                layout={!reduced}
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
                transition={{ duration: reduced ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                <button
                  type="button"
                  onClick={() => onSelect(thread)}
                  aria-current={active}
                  className={
                    "squircle relative flex w-full flex-col gap-1 rounded-db-md p-4 text-left " +
                    "outline outline-1 -outline-offset-1 outline-db-border-subtle " +
                    "transition-[background-color,outline-color] duration-300 ease-db " +
                    (thread.unread && !active
                      ? "bg-bg-surface-base-elevated outline-transparent hover:brightness-[0.98]"
                      : "bg-db-surface-default hover:bg-db-surface-muted")
                  }
                >
                  {/*
                   * Подсветка выбранного — отдельный слой с общим `layoutId`:
                   * при переходе на соседнее уведомление она переезжает, а не
                   * гаснет и зажигается в другом месте. Так видно, что список
                   * один, и взгляд не теряет, куда именно он перешёл.
                   */}
                  {active && (
                    <motion.span
                      layoutId={reduced ? undefined : "notification-active"}
                      transition={{ duration: reduced ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
                      className="squircle absolute inset-0 rounded-db-md bg-db-surface-muted"
                      aria-hidden
                    />
                  )}

                  <span className="relative flex w-full items-center gap-3">
                    <span className="line-clamp-1 flex-1 text-db-item font-medium text-db-text-primary">
                      {thread.title}
                    </span>
                    <span className="shrink-0 text-db-caption text-db-text-secondary">
                      {thread.time}
                    </span>
                  </span>

                  <span className="relative line-clamp-1 w-full text-db-caption text-db-text-secondary">
                    {thread.preview}
                  </span>
                </button>
              </motion.li>
            );
          })}
        </AnimatePresence>

        {threads.length === 0 && (
          <li className="squircle rounded-db-md bg-db-surface-muted p-4 text-db-caption text-db-text-secondary">
            Ничего не нашлось. Попробуйте изменить запрос.
          </li>
        )}
      </ul>
    </div>
  );
}
