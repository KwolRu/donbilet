"use client";

import Image from "next/image";
import { useState } from "react";
import { ArrowLeft, Pencil, X } from "lucide-react";

import profileCover from "@assets/images/account/profile-cover.png";
import { DbButton } from "@/components/ui/db-button";
import { DbToggle } from "@/components/ui/db-primitives";
import {
  MOCK_NOTIFICATIONS,
  MOCK_PROFILE,
  MOCK_SESSIONS,
  type NotificationSetting,
  type SessionInfo,
} from "@app/core/mocks/profile";

/**
 * Профиль покупателя.
 *
 * Раскладка из макета: всё содержимое — одна карточка с обводкой. Внутри
 * сверху строка заголовка с кнопкой «Изменить», под ней обложка 1508×252,
 * аватар 200×200 свисает с её нижнего края, дальше имя, контакты и две
 * колонки: уведомления и активные сеансы.
 *
 * Серой подложки в макете нет — фон рабочей области белый, и карточка
 * отделяется от него только обводкой.
 *
 * Данные моковые (`core/mocks/profile`), переключатели и закрытие сеансов
 * работают локально: API появится вместе с личным кабинетом (Ф5).
 */

/** Кнопка `tertiary` из макета: белая, без обводки, radius 12. */
const TERTIARY_BUTTON =
  "squircle flex items-center justify-center gap-1 rounded-db-sm bg-db-surface-default " +
  "transition-colors duration-300 ease-out hover:bg-db-surface-muted";

function ContactField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[12px] leading-4 text-db-text-secondary">{label}</span>
      <span className="text-[16px] leading-5 text-db-text-primary">{value}</span>
    </div>
  );
}

function SessionCard({ session, onClose }: { session: SessionInfo; onClose: () => void }) {
  return (
    <div
      className={
        "squircle flex flex-col justify-center gap-2 rounded-db-sm p-3 " +
        "transition-colors duration-300 ease-out " +
        // Текущее устройство подсвечено зелёным — так в макете.
        (session.current ? "bg-db-session-current" : "bg-db-surface-muted")
      }
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[16px] leading-5 font-medium text-db-text-primary">
            {session.device}
          </span>
          {session.current && (
            <span className="text-[14px] leading-5 text-db-text-secondary">Это устройство</span>
          )}
        </div>

        {!session.current && (
          <button
            type="button"
            onClick={onClose}
            aria-label={`Завершить сеанс: ${session.device}`}
            className="shrink-0 transition-opacity duration-300 ease-out hover:opacity-60"
          >
            <X className="size-4 text-db-text-secondary" strokeWidth={1.5} aria-hidden />
          </button>
        )}
      </div>

      <p className="text-[14px] leading-5 text-db-text-secondary">
        {session.platform}
        <br />
        {session.location} • {session.date}
      </p>
    </div>
  );
}

export function ProfileView() {
  const [notifications, setNotifications] = useState<NotificationSetting[]>(MOCK_NOTIFICATIONS);
  const [sessions, setSessions] = useState<SessionInfo[]>(MOCK_SESSIONS);

  function toggleNotification(id: string, enabled: boolean) {
    setNotifications((items) =>
      items.map((item) => (item.id === id ? { ...item, enabled } : item)),
    );
  }

  return (
    /* Шаг 24px между заголовком и карточкой — по макету. */
    <div className="flex w-full flex-1 flex-col gap-6">
      {/* Заголовок и действие — над карточкой, а не внутри неё: так в макете. */}
      <header className="flex items-center justify-between">
        <h1 className="text-[30px] leading-9 font-medium text-db-text-primary">Профиль</h1>

        <DbButton
          variant="plain"
          size="small"
          leftIcon={<ArrowLeft className="size-4" strokeWidth={1.5} aria-hidden />}
        >
          Изменить
        </DbButton>
      </header>

      {/*
       * Поля карточки из макета: 9px по бокам и сверху, снизу не задано —
       * карточка тянется до низа рабочей области, а контент прижат к верху.
       * Обводки в макете нет: карточка отделяется от фона цветом.
       */}
      <div className="squircle flex flex-1 flex-col gap-6 overflow-hidden rounded-db-xl bg-db-surface-default px-[9px] pt-[9px]">
        {/* Обложка и аватар */}
        <div className="relative">
          <Image
            src={profileCover}
            alt=""
            priority
            aria-hidden
            /* Кроп по нижней части: автобус и дорога в исходнике внизу справа,
               при кропе по центру в кадр попадают одни горы. */
            className="squircle h-[252px] w-full rounded-db-md object-cover object-[50%_78%]"
          />

          {/*
           * Аватар свисает с обложки: половина круга заходит на неё.
           * Белая рамка 8px отделяет его от картинки — в макете `border-8`.
           */}
          <div className="absolute top-[152px] left-6 size-[200px] overflow-hidden rounded-full border-8 border-db-surface-default">
            <Image
              src={MOCK_PROFILE.avatar}
              alt={MOCK_PROFILE.fullName}
              width={200}
              height={200}
              className="size-full rounded-full object-cover"
            />
          </div>
        </div>

        {/* Имя, дата рождения и контакты — правее аватара. */}
        <div className="flex flex-col gap-6 pt-4 pl-[240px]">
          <div className="flex items-start gap-4">
            <div className="flex flex-1 flex-col justify-center gap-1">
              <h2 className="text-[20px] leading-7 font-medium text-db-text-primary">
                {MOCK_PROFILE.fullName}
              </h2>
              <p className="text-[16px] leading-5 text-db-text-secondary">
                {MOCK_PROFILE.birthDate}
              </p>
            </div>

            <button
              type="button"
              aria-label="Редактировать профиль"
              className={`${TERTIARY_BUTTON} shrink-0 p-3`}
            >
              <Pencil className="size-4 text-db-text-primary" strokeWidth={1.5} aria-hidden />
            </button>
          </div>

          <div className="flex items-start gap-[60px]">
            <ContactField label="Телефон" value={MOCK_PROFILE.phone} />
            <ContactField label="Электронная почта" value={MOCK_PROFILE.email} />
            <ContactField label="Город" value={MOCK_PROFILE.city} />
          </div>
        </div>

        {/* Две колонки: настройки уведомлений и активные сеансы */}
        <div className="grid grid-cols-2 gap-6 pt-6 pl-[224px]">
          <section className="squircle flex flex-col gap-3 rounded-db-md bg-db-surface-default p-4 outline outline-1 -outline-offset-1 outline-db-border-subtle">
            <h3 className="text-[18px] leading-6 font-medium text-db-text-primary">Уведомления</h3>

            <ul className="flex flex-col gap-3">
              {notifications.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-2">
                  <span className="text-[16px] leading-5 text-db-text-primary">{item.label}</span>
                  <DbToggle
                    checked={item.enabled}
                    onChange={(next) => toggleNotification(item.id, next)}
                    label={item.label}
                  />
                </li>
              ))}
            </ul>
          </section>

          <section className="squircle flex flex-col gap-3 rounded-db-md bg-db-surface-default p-4 outline outline-1 -outline-offset-1 outline-db-border-subtle">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-[18px] leading-6 font-medium text-db-text-primary">
                Активные сеансы
              </h3>

              <button
                type="button"
                onClick={() => setSessions((items) => items.filter((item) => item.current))}
                className="squircle shrink-0 rounded-db-xs bg-db-surface-default p-2 outline outline-1 -outline-offset-1 outline-db-border-subtle transition-colors duration-300 ease-out hover:bg-db-surface-muted"
              >
                <span className="px-1 text-[12px] leading-3 text-db-text-primary">
                  Выйти на всех устройствах
                </span>
              </button>
            </div>

            <ul className="flex flex-col gap-3">
              {sessions.map((session) => (
                <li key={session.id}>
                  <SessionCard
                    session={session}
                    onClose={() =>
                      setSessions((items) => items.filter((item) => item.id !== session.id))
                    }
                  />
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
