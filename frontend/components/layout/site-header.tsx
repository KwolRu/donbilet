"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { AnimatePresence } from "motion/react";

import { Logo } from "./logo";
import { AccountMenu } from "./account-menu";
import { AppDownloadModal } from "./app-download-modal";
import { ACCOUNT_ROUTES, PUBLIC_ROUTES } from "@/lib/routing/public-paths";

/**
 * Шапка публичного сайта.
 *
 * Макет: фон #F6F6F6, отступы 32px по бокам и 16px сверху/снизу, элементы
 * разнесены по краям. На ширине 1920 это даёт 1856px контента.
 *
 * Шапка закреплена сверху (`fixed`) и всегда на виду. У верха страницы она
 * повторяет макет — светлая плашка #F6F6F6; стоит прокрутить — подложка
 * становится тёмной (#191919), а логотип и кнопки переключаются на светлые:
 * тёмная надпись на тёмном фоне не читается. Переход плавный, по той же
 * кривой, что и остальная анимация продукта.
 *
 * Клиентский компонент: держит открытие модалки «Скачать приложение» и
 * состояние прокрутки. Состояние авторизации появится в Ф5 — тогда
 * `AccountMenu` получит имя покупателя, а кнопка «Войти» сменится на «Выйти».
 */

/**
 * Высота шапки: 16 + 40 (логотип) + 16. Вынесена в константу, потому что на
 * столько же нужно опустить контент — `fixed` выключает шапку из потока, и без
 * распорки hero уехал бы под неё.
 */
const HEADER_HEIGHT = 72;

/** Маршруты, где шапка белая и стоит в потоке: под ней своя светлая панель. */
const WHITE_HEADER_PREFIXES = [PUBLIC_ROUTES.search];

/**
 * Кнопка-«линейка» из макета: белый фон, тонкая обводка.
 *
 * `db-underline` дорисовывает линию под подписью: при наведении она
 * прорисовывается слева направо, при уходе курсора уезжает обратно. Линия
 * рисуется `currentColor`, поэтому на тёмной подложке она белая сама собой.
 */
const LINER_BASE =
  "flex items-center justify-center gap-1 squircle rounded-db-sm " +
  "outline outline-1 -outline-offset-1 " +
  "transition-[background-color,color,outline-color] duration-300 ease-out";

/** Светлая шапка — как в макете; тёмная — прозрачные кнопки с белой подписью. */
const LINER_LIGHT =
  "bg-db-button-lianer-bg outline-db-border-subtle text-db-button-lianer-text hover:bg-db-surface-muted";
const LINER_DARK =
  "bg-transparent outline-db-border-strong text-db-text-inverse hover:bg-white/10";

/**
 * `variant`:
 *   landing — шапка лендинга: закреплена сверху и темнеет при прокрутке;
 *   plain   — шапка кабинета: в потоке, белый фон, без реакции на прокрутку.
 *             В этой зоне страница не прокручивается под шапку, и затемнение
 *             только мешало бы.
 */
export function SiteHeader({ variant }: { variant?: "landing" | "plain" }) {
  const pathname = usePathname();

  /*
   * Вариант можно задать явно (кабинет), а можно оставить на усмотрение
   * страницы: там, где сразу под шапкой стоит своя белая панель — выдача
   * поиска, — затемнение при прокрутке разрезает страницу пополам, и шапка
   * читается как чужая. На таких маршрутах шапка белая и в потоке.
   */
  const plain =
    variant === "plain" ||
    (variant === undefined && WHITE_HEADER_PREFIXES.some((prefix) => pathname.startsWith(prefix)));
  const [appModalOpen, setAppModalOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  /**
   * Порог 24px, а не 0: при микродрожании колеса у самого верха шапка иначе
   * мигала бы подложкой. Lenis двигает нативную прокрутку, поэтому обычного
   * события `scroll` достаточно — отдельной подписки на него не нужно.
   */
  useEffect(() => {
    if (plain) return;

    function onScroll() {
      setScrolled(window.scrollY > 24);
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [plain]);

  const linerTheme = scrolled ? LINER_DARK : LINER_LIGHT;

  return (
    <>
      <header
        className={
          "flex items-center justify-between px-8 py-4 " +
          "transition-[background-color,box-shadow] duration-300 ease-out " +
          (plain
            ? "shrink-0 bg-db-surface-default"
            : "fixed top-0 right-0 left-0 z-40 " +
              (scrolled
                ? "bg-db-surface-primary shadow-[0_8px_24px_rgba(0,0,0,0.18)]"
                : "bg-db-surface-muted"))
        }
        style={{ height: HEADER_HEIGHT }}
      >
        {/*
         * Оба логотипа лежат друг на друге и меняются прозрачностью: подмена
         * `src` переключала бы картинку рывком, да ещё и с подгрузкой файла.
         */}
        <Link
          href={PUBLIC_ROUTES.home}
          aria-label="ДонБилет — на главную"
          className="relative block h-10 w-[143px] shrink-0"
        >
          <Logo
            variant="dark"
            asLink={false}
            className={
              "absolute top-0 left-0 transition-opacity duration-300 ease-out " +
              (scrolled ? "opacity-0" : "opacity-100")
            }
          />
          <Logo
            variant="light"
            asLink={false}
            className={
              "absolute top-0 left-0 transition-opacity duration-300 ease-out " +
              (scrolled ? "opacity-100" : "opacity-0")
            }
          />
        </Link>

        <nav className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setAppModalOpen(true)}
            className={`db-underline ${LINER_BASE} ${linerTheme} px-4 py-3`}
          >
            <span className="px-1 text-center text-db-button">Скачать приложение</span>
          </button>

          <Link
            href={PUBLIC_ROUTES.contacts}
            className={`db-underline ${LINER_BASE} ${linerTheme} px-4 py-3`}
          >
            <span className="px-1 text-center text-db-button">Связаться с нами</span>
          </Link>

          <Link
            href={PUBLIC_ROUTES.b2b}
            className={`db-underline ${LINER_BASE} ${linerTheme} px-4 py-3`}
          >
            <span className="px-1 text-center text-db-button">ДонБилет для юрлиц</span>
          </Link>

          {/* У иконочной кнопки подписи нет — подчёркивать нечего, реагирует сама иконка. */}
          <Link
            href={ACCOUNT_ROUTES.favorites}
            aria-label="Избранное"
            className={`${LINER_BASE} ${linerTheme} group p-3`}
          >
            <Heart
              className="size-4 transition-[transform,color,fill] duration-300 ease-out group-hover:fill-db-icon-error group-hover:text-db-icon-error"
              strokeWidth={1.5}
              aria-hidden
            />
          </Link>

          <AccountMenu dark={scrolled} />
        </nav>
      </header>

      {/* Распорка под `fixed`-шапку: держит за неё место в потоке.
          В варианте `plain` шапка и так в потоке — распорка не нужна. */}
      {!plain && <div aria-hidden style={{ height: HEADER_HEIGHT }} />}

      {/* AnimatePresence держит модалку в DOM, пока доигрывает закрытие. */}
      <AnimatePresence>
        {appModalOpen && <AppDownloadModal onClose={() => setAppModalOpen(false)} />}
      </AnimatePresence>
    </>
  );
}
