"use client";

import { AnimatePresence } from "motion/react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { LoadingScreen } from "./loading-screen";
import { routeShell } from "@/lib/routing/public-paths";

/**
 * Экран загрузки при переходе между страницами — тот же, что встречает на
 * первом заходе.
 *
 * Показывается на всём публичном сайте: и когда меняется каркас (лендинг →
 * вход: белая шапка, нет футера, слева меню кабинета), и когда открывается
 * соседняя страница сайта — новости, вопросы. Страницы лендинга собираются из
 * длинных секций с картинками, и без экрана переход читается как задержка
 * клика, а не как загрузка.
 *
 * Единственное исключение — переходы внутри кабинета (профиль → билеты).
 * Там каркас с боковым меню стоит на месте, меняется середина, и
 * полноэкранный экран был бы тяжелее самого перехода: ему хватает мягкого
 * `PageTransition` и тонкой полосы `RouteProgress`.
 *
 * Начало перехода ловится так же, как в `RouteProgress`: в App Router нет
 * событий роутера, поэтому слушаем клик по внутренней ссылке. `popstate`
 * («назад») не в счёт — там переход уже идёт, и экран успел бы только моргнуть.
 */

/**
 * Минимальный показ. Экран появляется сразу по клику, а не после паузы
 * «вдруг успеем»: смена каркаса заметна и на мгновенном переходе, и лучше
 * увидеть спокойный экран загрузки, чем подмену шапки, футера и меню разом.
 * Полсекунды — чтобы он не мелькнул кадром, который читается как сбой.
 */
const MIN_VISIBLE = 550;
/** Потолок ожидания: до 100% доводит только состоявшийся переход. */
const CEILING = 0.9;
/** Шаг ползунка. */
const TICK = 160;
/** Страховка: переход не состоялся — экран не должен запереть сайт. */
const MAX_VISIBLE = 6000;

export function RouteLoader() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  const timers = useRef<{ tick?: number; guard?: number; hide?: number }>({});
  /** Куда ведёт начатый переход: пока адрес не сменился на него, экран держится. */
  const pendingPath = useRef<string | null>(null);
  /** Момент показа — чтобы выдержать MIN_VISIBLE. */
  const shownAt = useRef(0);
  const visibleRef = useRef(false);

  const clearTimers = useCallback(() => {
    const { tick, guard, hide } = timers.current;
    if (tick) window.clearInterval(tick);
    if (guard) window.clearTimeout(guard);
    if (hide) window.clearTimeout(hide);
    timers.current = {};
  }, []);

  const hide = useCallback(() => {
    clearTimers();
    pendingPath.current = null;
    visibleRef.current = false;
    setVisible(false);
    setProgress(0);
  }, [clearTimers]);

  const finish = useCallback(() => {
    if (!visibleRef.current) return;

    clearTimers();
    setProgress(1);

    const shownFor = performance.now() - shownAt.current;
    timers.current.hide = window.setTimeout(hide, Math.max(0, MIN_VISIBLE - shownFor));
  }, [clearTimers, hide]);

  const start = useCallback(
    (target: string) => {
      clearTimers();
      pendingPath.current = target;

      shownAt.current = performance.now();
      visibleRef.current = true;
      setVisible(true);
      setProgress(0.15);

      // Шаг тем меньше, чем ближе к потолку: движение не прекращается, но и
      // не обещает готовности, которой ещё нет.
      timers.current.tick = window.setInterval(() => {
        setProgress((current) => current + (CEILING - current) * 0.2);
      }, TICK);

      timers.current.guard = window.setTimeout(hide, MAX_VISIBLE);
    },
    [clearTimers, hide],
  );

  // Смена пути = новый сегмент отрисован. Завершение уводим за пределы эффекта:
  // синхронный setState в эффекте дал бы каскад рендеров.
  useEffect(() => {
    if (!pendingPath.current) return;
    if (pathname !== pendingPath.current) return;

    const id = window.setTimeout(finish, 0);
    return () => window.clearTimeout(id);
  }, [pathname, finish]);

  useEffect(() => clearTimers, [clearTimers]);

  // Пока экран виден, страница под ним не должна прокручиваться.
  useEffect(() => {
    if (!visible) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [visible]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      // Ctrl/Cmd/Shift-клик и средняя кнопка открывают новую вкладку — текущая
      // страница остаётся на месте, экран загрузки там был бы ложным.
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = (event.target as HTMLElement | null)?.closest?.("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname) return;

      // Переход внутри кабинета — там меняется только середина экрана,
      // и хватит полосы RouteProgress.
      if (routeShell(url.pathname) === "account" && routeShell(window.location.pathname) === "account") {
        return;
      }

      start(url.pathname);
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [start]);

  return (
    <AnimatePresence>
      {visible && <LoadingScreen key="route-loader" progress={progress} label="Переход на страницу" />}
    </AnimatePresence>
  );
}
