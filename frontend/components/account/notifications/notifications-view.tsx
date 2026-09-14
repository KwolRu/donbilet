"use client";

import { useMemo, useState } from "react";

import { DbButton } from "@/components/ui/db-button";
import { useDebouncedValue } from "@app/core/hooks/useDebouncedValue";
import { SupportPanel } from "./support-panel";
import { ThreadList } from "./thread-list";
import { ThreadView } from "./thread-view";
import { MOCK_THREADS, type NotificationThread } from "@app/core/mocks/notifications";

/**
 * Раздел «Уведомления».
 *
 * Две колонки в одной белой карточке: слева список, справа переписка. Высота
 * карточки равна рабочей области — прокрутка живёт внутри неё, в списке и в
 * ленте сообщений по отдельности. Прокручивать страницу целиком нельзя:
 * уехали бы и заголовок раздела, и поле ввода сообщения.
 *
 * Открытое уведомление помечается прочитанным — жёлтая подсветка гаснет.
 * Данные моковые (`core/mocks/notifications`), новое обращение добавляется в
 * начало списка: до появления API (Ф5) этого хватает, чтобы пройти весь путь.
 */
export function NotificationsView() {
  const [threads, setThreads] = useState<NotificationThread[]>(MOCK_THREADS);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [supportOpen, setSupportOpen] = useState(false);

  // Поиск с задержкой: без неё список перебирается на каждый символ.
  const debouncedQuery = useDebouncedValue(query);

  const visible = useMemo(() => {
    const needle = debouncedQuery.trim().toLowerCase();
    if (!needle) return threads;

    return threads.filter((thread) =>
      [thread.title, thread.preview].some((field) => field.toLowerCase().includes(needle)),
    );
  }, [threads, debouncedQuery]);

  const active = threads.find((thread) => thread.id === activeId) ?? null;

  function openThread(thread: NotificationThread) {
    setActiveId(thread.id);
    // Прочитанное уведомление теряет жёлтую подсветку — это и есть «прочитано».
    setThreads((current) =>
      current.map((item) => (item.id === thread.id ? { ...item, unread: false } : item)),
    );
  }

  function createTicket(topicLabel: string, message: string) {
    const time = new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(
      new Date(),
    );
    const id = threads.reduce((max, thread) => Math.max(max, thread.id), 0) + 1;

    const thread: NotificationThread = {
      id,
      kind: "ticket",
      title: topicLabel,
      preview: message,
      time,
      unread: false,
      date: "Сегодня",
      messages: [{ id: 1, author: "me", text: message, time, read: false }],
    };

    setThreads((current) => [thread, ...current]);
    setActiveId(id);
    setSupportOpen(false);
  }

  return (
    // `min-h-0` на колонке: без него карточка растягивает рабочую область, и
    // прокрутка появляется у страницы вместо списка.
    <div className="flex min-h-0 w-full flex-1 flex-col gap-6">
      <header className="flex shrink-0 items-center justify-between gap-4">
        <h1 className="text-db-page font-medium text-db-text-primary">Уведомления</h1>

        <DbButton variant="tertiary" onClick={() => setSupportOpen(true)}>
          Создать обращение
        </DbButton>
      </header>

      <div className="squircle flex min-h-0 flex-1 items-stretch gap-4 rounded-db-xl bg-db-surface-default p-6">
        <ThreadList
          threads={visible}
          activeId={activeId}
          query={query}
          onQueryChange={setQuery}
          onSelect={openThread}
        />

        <ThreadView thread={active} />
      </div>

      <SupportPanel
        open={supportOpen}
        onClose={() => setSupportOpen(false)}
        onSubmit={createTicket}
      />
    </div>
  );
}
