"use client";

import Link from "next/link";
import { History, MessageSquare, Ticket, User } from "lucide-react";

import { DbLinkButton } from "@/components/ui/db-button";
import { ACCOUNT_ROUTES, AUTH_ROUTES } from "@/lib/routing/public-paths";
import { usePopover } from "@app/core/hooks/use-popover";
import { DbPopoverPanel } from "@/components/ui/db-popover";

/**
 * Меню личного кабинета в шапке (фрейм `account/main` макета).
 *
 * Размеры из макета: карточка 252px (padding 24 + колонка 204), пункты — ghost
 * кнопки 16/12 с иконкой 16 и шагом 4, снизу кнопка «Войти» варианта secondary.
 *
 * Пункты видны и без сессии — это навигация, а не признак авторизации. Доступ
 * закрывает `proxy.ts` по cookie: без сессии переход уводит на вход. Кнопка
 * «Войти» останется до Ф5, когда появится настоящее состояние auth; тогда она
 * сменится на «Выйти», а меню получит имя покупателя.
 */

const ITEMS = [
  { label: "Мои билеты", href: ACCOUNT_ROUTES.tickets, Icon: Ticket },
  { label: "История поездок", href: ACCOUNT_ROUTES.history, Icon: History },
  { label: "Сообщения", href: ACCOUNT_ROUTES.messages, Icon: MessageSquare },
  { label: "Профиль", href: ACCOUNT_ROUTES.root, Icon: User },
];

export function AccountMenu({ dark = false }: { dark?: boolean }) {
  const { open, setOpen, ref } = usePopover();

  return (
    <div ref={ref} className="relative">
      {/*
       * Жёлтая заливка — активное состояние, то есть раскрытое меню. В покое
       * кнопка белая с обводкой, как соседняя «Избранное»: в макете это один и
       * тот же иконочный элемент в двух состояниях.
       *
       * `dark` — шапка на тёмной подложке (страница прокручена). Тогда покой
       * рисуется прозрачной кнопкой со светлой обводкой: белая плашка рядом с
       * такой же прозрачной «Избранное» выглядела бы случайной.
       */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label="Личный кабинет"
        className={
          "squircle flex items-center justify-center gap-1 rounded-db-sm p-3 " +
          "outline outline-1 -outline-offset-1 " +
          "transition-[background-color,color,outline-color] duration-300 ease-out " +
          (open
            ? "bg-db-button-primary-bg text-db-text-primary outline-transparent"
            : dark
              ? "bg-transparent text-db-text-inverse outline-db-border-strong hover:bg-white/10"
              : "bg-db-button-lianer-bg text-db-text-primary outline-db-border-subtle hover:bg-db-surface-muted")
        }
      >
        <User className="size-4" strokeWidth={1.5} aria-hidden />
      </button>

      <DbPopoverPanel
        open={open}
        origin="top right"
        className="squircle absolute top-full right-0 z-30 mt-2 flex w-[252px] flex-col gap-2.5 rounded-db-xl bg-db-surface-default p-6 shadow-[0_4px_29.5px_rgba(36,35,32,0.20)]"
      >
        <div className="flex flex-col gap-1">
          {ITEMS.map(({ label, href, Icon }) => (
            <Link
              key={label}
              href={href}
              onClick={() => setOpen(false)}
              className="squircle group flex items-center gap-1 rounded-db-sm px-4 py-3 transition-colors duration-300 ease-out hover:bg-db-surface-muted"
            >
              <Icon
                className="size-4 shrink-0 text-db-text-primary transition-transform duration-300 ease-out group-hover:translate-x-0.5"
                strokeWidth={1.5}
                aria-hidden
              />
              <span className="px-1 text-db-button text-db-text-primary transition-transform duration-300 ease-out group-hover:translate-x-0.5">
                {label}
              </span>
            </Link>
          ))}
        </div>

        <DbLinkButton
          href={AUTH_ROUTES.login}
          variant="secondary"
          size="small"
          className="w-full"
          onClick={() => setOpen(false)}
        >
          Войти
        </DbLinkButton>
      </DbPopoverPanel>
    </div>
  );
}
