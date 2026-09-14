"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart } from "lucide-react";

import qrCode from "@assets/images/landing/footer/qr.svg";

import { Logo } from "./logo";
import { STORE_ICONS } from "./store-icons";
import { SOCIAL_ICONS, SocialIcon } from "./social-icons";
import { PUBLIC_ROUTES } from "@/lib/routing/public-paths";

/**
 * Футер публичного сайта.
 *
 * Макет: фон #191919, скруглённые верхние углы 32px, отступы 44/32/32/32,
 * две строки — навигация и нижняя полоса с правовыми ссылками.
 *
 * Данные не тянет: вся навигация статическая, адреса берутся из
 * `lib/routing/public-paths.ts` — единого источника правды по маршрутам.
 */

type FooterLink = { label: string; href: string };

const NAV_COLUMNS: Array<{ title: string; links: FooterLink[] }> = [
  {
    title: "Покупка",
    links: [
      { label: "Автобусные билеты", href: PUBLIC_ROUTES.search },
      { label: "Авиабилеты", href: PUBLIC_ROUTES.avia },
      { label: "Билеты на поезд", href: PUBLIC_ROUTES.rail },
      { label: "Отели", href: PUBLIC_ROUTES.hotels },
    ],
  },
  {
    title: "Компания",
    links: [
      { label: "О ДонБилет", href: PUBLIC_ROUTES.about },
      { label: "Контакты", href: PUBLIC_ROUTES.contacts },
      { label: "Для бизнеса", href: PUBLIC_ROUTES.b2b },
    ],
  },
  {
    title: "Помощь",
    links: [
      { label: "Служба поддержки", href: PUBLIC_ROUTES.support },
      { label: "Вопросы и ответы", href: PUBLIC_ROUTES.faq },
      { label: "Расписание", href: PUBLIC_ROUTES.schedules },
    ],
  },
];

const LEGAL_LINKS: FooterLink[] = [
  { label: "Договор оферты", href: PUBLIC_ROUTES.publicOffer },
  { label: "Политика конфиденциальности", href: PUBLIC_ROUTES.privacyPolicy },
  {
    label: "Согласие на обработку персональных данных",
    href: PUBLIC_ROUTES.personalDataConsent,
  },
];

/** Плашка 32×32 из макета: фон #525252, радиус 8. */
const TILE =
  "flex size-8 items-center justify-center overflow-hidden squircle rounded-db-xs " +
  "bg-db-surface-secondary transition-opacity duration-300 ease-out " +
  " hover:opacity-80";

export function SiteFooter() {
  return (
    <footer className="flex flex-col gap-8 squircle rounded-t-db-2xl bg-db-surface-primary px-8 pt-11 pb-8">
      <div className="flex items-start justify-between">
        {/* Бренд, описание, соцсети */}
        <div className="flex w-[280px] flex-col gap-4">
          <Logo variant="light" />

          <p className="text-db-body text-db-text-tertiary">
            Билеты на автобусы, поезда, самолёты и отели
          </p>

          <ul className="flex items-center gap-2">
            {SOCIAL_ICONS.map(({ label, src }) => (
              <li key={label}>
                {/* Плашка входит в сам SVG — обёртка ничего не красит. */}
                <a
                  href="#"
                  aria-label={label}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="block transition-opacity duration-300 ease-out hover:opacity-80"
                >
                  <SocialIcon src={src} label={label} />
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-start gap-8">
          <nav className="flex items-start gap-8">
            {NAV_COLUMNS.map((column) => (
              <div key={column.title} className="flex w-[200px] flex-col gap-4">
                <h2 className="text-db-heading font-medium text-db-text-inverse">
                  {column.title}
                </h2>
                <ul className="flex flex-col gap-3">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="db-link-underline text-db-body text-db-text-tertiary transition-colors duration-300 ease-out hover:text-db-text-inverse"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>

          {/* Мобильное приложение */}
          <div className="flex w-[397px] items-start gap-4 border-l border-db-border-strong pl-8">
            <div className="flex flex-1 flex-col justify-between self-stretch">
              <div className="flex flex-col gap-1">
                <h2 className="text-db-heading font-medium text-db-text-inverse">
                  Мобильное приложение
                </h2>
                <p className="text-db-body text-db-text-tertiary">
                  Покупайте билеты ещё удобнее
                </p>
              </div>

              <ul className="flex items-center gap-2">
                {STORE_ICONS.map((store) => (
                  <li key={store.label}>
                    <a
                      href={store.href}
                      aria-label={store.label}
                      target="_blank"
                      rel="noreferrer noopener"
                      className={TILE}
                    >
                      {/*
                       * Глифы уже белые — перекрашивать нечем и незачем.
                       * Высота фиксирована, ширина свободна: у яблока и
                       * треугольника Play разные пропорции, и жёсткий квадрат
                       * их бы растянул.
                       */}
                      <Image src={store.src} alt="" aria-hidden className="h-4 w-auto" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col items-center justify-center squircle rounded-db-xl bg-db-surface-default bg-gradient-to-b from-white/0 to-white p-4">
              <Image
                src={qrCode}
                alt="QR-код для загрузки приложения"
                width={142}
                height={142}
                loading="eager"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Нижняя полоса */}
      <div className="flex items-center justify-between border-t border-db-border-strong pt-8">
        <p className="text-db-body text-db-text-tertiary">
          © 2018–2026 ДонБилет. Все права защищены.
        </p>

        <ul className="flex items-center gap-6">
          {LEGAL_LINKS.map((link) => (
            <li key={link.label}>
              <Link
                href={link.href}
                className="db-link-underline text-db-body text-db-text-tertiary transition-colors duration-300 ease-out hover:text-db-text-inverse"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <p className="flex items-center gap-2 text-db-body text-db-text-tertiary">
          Made by KWOL
          <Heart className="size-3 fill-db-icon-error text-db-icon-error" aria-hidden />
        </p>
      </div>
    </footer>
  );
}
