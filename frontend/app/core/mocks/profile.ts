import { avatarFor } from "./avatars";

import type { StaticImageData } from "next/image";

/**
 * Мок профиля до появления рабочего API (блокер B1).
 *
 * Значения — из макета `Профиль`. Форма объектов повторяет будущий ответ
 * `core/api/profile`: когда появится стенд, меняется только источник.
 */

export type MockProfile = {
  fullName: string;
  birthDate: string;
  phone: string;
  email: string;
  city: string;
  avatar: StaticImageData;
};

export const MOCK_PROFILE: MockProfile = {
  fullName: "Чернышёв Михаил Николаевич",
  birthDate: "10.09.1997",
  phone: "+7 999 123-45-67",
  email: "alexander_petrovich@mail.ru",
  city: "Новосибирск",
  avatar: avatarFor(0),
};

export type NotificationSetting = {
  id: string;
  label: string;
  /** Канал: в макете список из шести строк — по три на почту и пуши. */
  channel: "email" | "push";
  enabled: boolean;
};

export const MOCK_NOTIFICATIONS: NotificationSetting[] = [
  { id: "email-promo", label: "Акции и спец предложения", channel: "email", enabled: true },
  {
    id: "email-insurance",
    label: "Страховка жизни и риска отмены рейса",
    channel: "email",
    enabled: true,
  },
  { id: "email-reminder", label: "Напоминание о поездке", channel: "email", enabled: false },
  { id: "push-promo", label: "Акции и спец предложения", channel: "push", enabled: true },
  {
    id: "push-insurance",
    label: "Страховка жизни и риска отмены рейса",
    channel: "push",
    enabled: false,
  },
  { id: "push-reminder", label: "Напоминание о поездке", channel: "push", enabled: false },
];

export type SessionInfo = {
  id: string;
  device: string;
  /** Текущее устройство помечается и не закрывается крестиком. */
  current: boolean;
  platform: string;
  location: string;
  date: string;
};

export const MOCK_SESSIONS: SessionInfo[] = [
  {
    id: "desktop",
    device: "ROG STRIX G15DK",
    current: true,
    platform: "Desktop 7.2.7 x64",
    location: "Novosibirsk, Russia",
    date: "17.03.2026",
  },
  {
    id: "mobile",
    device: "Tecno TECNO CAMON 30",
    current: false,
    platform: "Android 12.10.1",
    location: "Novosibirsk, Russia",
    date: "17.03.2026",
  },
];
