import { create } from "zustand";

/**
 * Очередь тостов приложения.
 *
 * Эталон стора шаблона: единственный владелец состояния, компоненты только
 * читают и вызывают действия. Тосты показываются по одному — новый встаёт
 * в очередь, а не перекрывает текущий.
 *
 * Доменные события (например, «задача просрочена») кладут сюда `push(...)` —
 * расширять сам стор под каждый тип уведомления не нужно.
 */
export type NotificationKind = "info" | "success" | "warning" | "error";

export type AppNotification = {
  id: string;
  kind: NotificationKind;
  title: string;
  subtitle?: string;
  /** Куда ведёт кнопка действия. Без него кнопка не рисуется. */
  targetHref?: string;
  actionLabel?: string;
  /** Мс до автозакрытия. 0 — не закрывать автоматически. */
  autoHideMs?: number;
};

type NotificationInput = Omit<AppNotification, "id"> & { id?: string };

type NotificationState = {
  queue: AppNotification[];
  current: AppNotification | null;
  visible: boolean;
  push: (notification: NotificationInput) => void;
  dismiss: () => void;
  clear: () => void;
};

const DEFAULT_AUTO_HIDE_MS = 5_000;

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  queue: [],
  current: null,
  visible: false,

  push: (notification) => {
    const item: AppNotification = {
      autoHideMs: DEFAULT_AUTO_HIDE_MS,
      ...notification,
      id: notification.id ?? createId(),
    };

    // Свободно — показываем сразу, иначе в очередь.
    if (!get().current) {
      set({ current: item, visible: true });
      return;
    }
    set((state) => ({ queue: [...state.queue, item] }));
  },

  dismiss: () => {
    const { queue } = get();
    const [next, ...rest] = queue;

    if (next) {
      set({ current: next, queue: rest, visible: true });
      return;
    }
    set({ current: null, queue: [], visible: false });
  },

  clear: () => set({ queue: [], current: null, visible: false }),
}));

/** Короткие хелперы, чтобы не собирать объект на каждом вызове. */
export const notify = {
  info: (title: string, subtitle?: string) =>
    useNotificationStore.getState().push({ kind: "info", title, subtitle }),
  success: (title: string, subtitle?: string) =>
    useNotificationStore.getState().push({ kind: "success", title, subtitle }),
  warning: (title: string, subtitle?: string) =>
    useNotificationStore.getState().push({ kind: "warning", title, subtitle }),
  error: (title: string, subtitle?: string) =>
    useNotificationStore.getState().push({ kind: "error", title, subtitle }),
};
