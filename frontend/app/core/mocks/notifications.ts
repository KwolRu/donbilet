/**
 * Мок-данные раздела «Уведомления».
 *
 * Форма записи повторяет ожидаемый ответ API (`GET /api/notifications`): при
 * подключении стенда (блокер B1) меняется только источник.
 *
 * В разделе живут две разные сущности с общим списком:
 *   `system` — уведомление сервиса: рейс перенесён, возврат одобрен. Читается,
 *              но не отвечается — отсюда плашка внизу переписки;
 *   `ticket` — обращение в поддержку: переписка с оператором, есть поле ввода.
 * Различие не косметическое, поэтому оно в данных, а не в вёрстке.
 */

export type ThreadKind = "system" | "ticket";

/**
 * Файл, уже отправленный в сообщении.
 *
 * `kind` решает, как вложение показывать: картинку и видео открывает
 * просмотрщик, остальное — только скачивается. Тип приходит с бэкенда вместе
 * с файлом, а не угадывается по расширению: расширение врёт чаще, чем кажется.
 *
 * `url` нет у своих, ещё не загруженных файлов — до ответа сервера показывать
 * нечего, и просмотрщик такое вложение не откроет.
 */
export type AttachmentKind = "image" | "video" | "file";

export type MessageAttachment = {
  name: string;
  size: number;
  kind?: AttachmentKind;
  url?: string;
  /** Кадр-заставка видео: без него в ленте висит чёрный прямоугольник. */
  poster?: string;
  /** Длительность видео в секундах — подпись на превью. */
  duration?: number;
};

/**
 * Тип вложения по MIME. Берём его у браузера, а не из расширения: расширение
 * врёт чаще, чем кажется, и `.jpg` вполне может оказаться документом.
 */
export function attachmentKindOf(type: string): AttachmentKind {
  if (type.startsWith("image/")) return "image";
  if (type.startsWith("video/")) return "video";
  return "file";
}

/** «1:04» — длительность ролика для подписи на превью и в плеере. */
export function formatDuration(seconds: number): string {
  const total = Number.isFinite(seconds) ? Math.max(0, Math.round(seconds)) : 0;
  const minutes = Math.floor(total / 60);
  return `${minutes}:${String(total % 60).padStart(2, "0")}`;
}

export type ChatMessage = {
  id: number;
  /** `service` — от ДонБилет, `me` — от пользователя. */
  author: "service" | "me";
  /** Заголовок есть только у первого сообщения системного уведомления. */
  title?: string;
  text: string;
  time: string;
  /** Своё сообщение прочитано оператором — синие галочки в макете. */
  read?: boolean;
  /** Вложения: к одному сообщению их может быть несколько. */
  attachments?: MessageAttachment[];
};

export type NotificationThread = {
  id: number;
  kind: ThreadKind;
  title: string;
  /** Строка списка: короткая выжимка последнего сообщения. */
  preview: string;
  time: string;
  /** Непрочитанное подсвечено жёлтым (`bg/surface/base/elevated`). */
  unread: boolean;
  /** Дата-разделитель над первым сообщением. */
  date: string;
  messages: ChatMessage[];
};

const REFUND_TEXT =
  "Мы успешно обработали ваш запрос на возврат и подтвердили его. Денежные средства будут " +
  "возвращены на исходный способ оплаты в течение 1–5 рабочих дней в зависимости от банка.\n" +
  "Спасибо, что путешествуете с ДонБилет!";

export const MOCK_THREADS: NotificationThread[] = [
  {
    id: 1,
    kind: "system",
    title: "Рейс отменён",
    preview: "По билету № BN-1122-77889 отказано в возврате",
    time: "16:31",
    unread: true,
    date: "17 августа, пн",
    messages: [
      {
        id: 1,
        author: "service",
        title: "Ваш возврат по билету № BN-8374-54558 одобрен",
        text: REFUND_TEXT,
        time: "10:56",
      },
    ],
  },
  {
    id: 2,
    kind: "ticket",
    title: "Возврат билета",
    preview: "Ваш возврат по билету № BN-8374-54558 одобрен",
    time: "16:31",
    unread: false,
    date: "17 августа, пн",
    messages: [
      {
        id: 1,
        author: "service",
        title: "Ваш возврат по билету № BN-8374-54558 одобрен",
        text: REFUND_TEXT,
        time: "10:56",
      },
      {
        id: 2,
        author: "me",
        text: "Спасибо! Подскажите, деньги придут на ту же карту, с которой платил?",
        time: "10:56",
        read: true,
      },
      {
        id: 3,
        author: "me",
        text: "Прикладываю фото посадочного и короткое видео с табло на вокзале.",
        time: "11:02",
        read: true,
        attachments: [
          {
            name: "boarding-pass.png",
            size: 2_540_000,
            kind: "image",
            url: "/media/demo-photo.png",
          },
          {
            name: "vokzal.webm",
            size: 446_000,
            kind: "video",
            url: "/media/demo-video.webm",
            poster: "/media/demo-video-poster.png",
            duration: 6,
          },
          {
            name: "Квитанция об оплате.pdf",
            size: 184_000,
            kind: "file",
          },
        ],
      },
    ],
  },
  {
    id: 3,
    kind: "system",
    title: "Изменилось время отправления и прибытия",
    preview: "Рейс № LX-423 перенесён на 18 августа. Новое время отправления — 23:40",
    time: "16:31",
    unread: true,
    date: "17 августа, пн",
    messages: [
      {
        id: 1,
        author: "service",
        title: "Рейс № LX-423 перенесён",
        text:
          "Рейс № LX-423 перенесён на 18 августа. Новое время отправления — 23:40, " +
          "прибытия — 06:15. Билеты действительны, менять их не нужно.",
        time: "16:31",
      },
    ],
  },
  {
    id: 4,
    kind: "system",
    title: "Рейс перенесён",
    preview: "Рейс № LX-423 Санкт-Петербург — Краснодар перенесён на 18 августа 01:50",
    time: "16:31",
    unread: false,
    date: "16 августа, вс",
    messages: [
      {
        id: 1,
        author: "service",
        title: "Рейс № LX-423 перенесён",
        text: "Рейс № LX-423 Санкт-Петербург — Краснодар перенесён на 18 августа 01:50.",
        time: "16:31",
      },
    ],
  },
  ...Array.from({ length: 5 }, (_, index) => ({
    id: 5 + index,
    kind: "system" as const,
    title: index % 2 === 0 ? "Возврат подтверждён" : "Расписание изменено",
    preview: "Ваш возврат по билету № BN-8374-54558 одобрен",
    time: "16:31",
    unread: false,
    date: "15 августа, пт",
    messages: [
      {
        id: 1,
        author: "service" as const,
        title: "Ваш возврат по билету № BN-8374-54558 одобрен",
        text: REFUND_TEXT,
        time: "10:56",
      },
    ],
  })),
];

/** Темы обращения в поддержку — список из макета. */
export const SUPPORT_TOPICS = [
  { value: "refund", label: "Возврат билета" },
  { value: "payment", label: "Оплата" },
  { value: "schedule", label: "Расписание и рейсы" },
  { value: "documents", label: "Документы пассажира" },
  { value: "other", label: "Другое" },
] as const;

/** Ограничение длины сообщения из макета — счётчик «57/1000». */
export const SUPPORT_MESSAGE_LIMIT = 1000;

/**
 * Что принимаем вложением. Ограничения нужны и форме, и подсказке под полем:
 * пользователь должен узнать о перевесе до отправки, а не после.
 *
 * Три предела, и каждый про своё: тип файла — что мы умеем показать оператору,
 * размер одного — что пройдёт через загрузку, количество и общий вес — чтобы
 * одно обращение не превращалось в архив переписки.
 */
export const ATTACHMENT_ACCEPT = ".pdf,.png,.jpg,.jpeg,.heic,.doc,.docx,.mp4,.webm,.mov";
export const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;
export const ATTACHMENTS_MAX_COUNT = 5;
export const ATTACHMENTS_MAX_TOTAL_BYTES = 25 * 1024 * 1024;

/** «2,4 МБ» — размер файла для подписи вложения. */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} МБ`;
}
