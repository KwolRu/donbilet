"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Полоса прогресса перехода между страницами.
 *
 * В App Router нет событий роутера (`routeChangeStart` из Pages Router убрали),
 * поэтому начало перехода ловим по клику на внутреннюю ссылку и по `popstate`
 * («назад»/«вперёд»), а конец — по смене `pathname`: новый путь в хуке означает,
 * что новый сегмент уже отрисован.
 *
 * Появление отложено на `START_DELAY`: мгновенный переход не должен мигать
 * полоской — это шумнее, чем отсутствие индикатора. Пока сегмент грузится,
 * полоса ползёт к 90% с замедлением: до 100% доводит только реальное
 * завершение перехода, иначе индикатор врёт о готовности.
 *
 * Перехват кликов глобальный, а не через обёртку над `Link`: так индикатор
 * работает на всех ссылках сайта, включая те, что появятся позже, и не требует
 * помнить про специальный компонент при вёрстке новой страницы.
 */

/** Сколько ждём перед показом: быстрее — переход считается мгновенным. */
const START_DELAY = 150;
/** Шаг анимации ползунка. */
const TICK = 180;
/** Потолок «ожидания»: до 100% доводит только завершённый переход. */
const CEILING = 90;
/** Плавное затухание после 100%. */
const HIDE_DELAY = 260;
/** Страховка: если конец перехода почему-то не пришёл, полоса не зависнет. */
const MAX_DURATION = 10_000;

export function RouteProgress() {
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  const timers = useRef<{ start?: number; tick?: number; hide?: number; guard?: number; finish?: number }>({});
  /** Показана ли полоса — читаем из обработчиков, не пересоздавая их на каждый рендер. */
  const visibleRef = useRef(false);

  const setVisibility = useCallback((next: boolean) => {
    visibleRef.current = next;
    setVisible(next);
  }, []);

  const clearTimers = useCallback(() => {
    const { start, tick, hide, guard, finish } = timers.current;
    if (start) window.clearTimeout(start);
    if (tick) window.clearInterval(tick);
    if (hide) window.clearTimeout(hide);
    if (guard) window.clearTimeout(guard);
    if (finish) window.clearTimeout(finish);
    timers.current = {};
  }, []);

  const finish = useCallback(() => {
    const wasVisible = visibleRef.current;
    clearTimers();

    if (!wasVisible) {
      // Переход уложился в START_DELAY — показывать было нечего.
      setProgress(0);
      return;
    }

    setProgress(100);
    timers.current.hide = window.setTimeout(() => {
      setVisibility(false);
      setProgress(0);
    }, HIDE_DELAY);
  }, [clearTimers, setVisibility]);

  const start = useCallback(() => {
    clearTimers();
    setProgress(0);

    timers.current.start = window.setTimeout(() => {
      setVisibility(true);
      setProgress(12);

      // Шаг тем меньше, чем ближе к потолку: движение не останавливается,
      // но и не создаёт впечатления, что страница вот-вот откроется.
      timers.current.tick = window.setInterval(() => {
        setProgress((current) => current + (CEILING - current) * 0.2);
      }, TICK);
    }, START_DELAY);

    timers.current.guard = window.setTimeout(() => {
      clearTimers();
      setVisibility(false);
      setProgress(0);
    }, MAX_DURATION);
  }, [clearTimers, setVisibility]);

  // Смена пути = новый сегмент отрисован. Завершение уводим за пределы эффекта:
  // синхронный setState в эффекте вызвал бы каскад рендеров.
  useEffect(() => {
    const id = window.setTimeout(finish, 0);
    timers.current.finish = id;
    return () => window.clearTimeout(id);
  }, [pathname, finish]);

  useEffect(() => clearTimers, [clearTimers]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      // Ctrl/Cmd/Shift-клик и средняя кнопка открывают новую вкладку — текущая
      // страница остаётся на месте, индикатор там был бы ложным.
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = (event.target as HTMLElement | null)?.closest?.("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;

      // Якорь внутри той же страницы — это прокрутка, а не переход.
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;

      start();
    };

    const onPopState = () => start();

    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPopState);

    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState);
    };
  }, [start]);

  if (!visible) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px]"
      role="progressbar"
      aria-label="Загрузка страницы"
    >
      <div
        className="h-full bg-db-surface-base transition-[width,opacity] duration-200 ease-out"
        style={{ width: `${progress}%`, opacity: progress >= 100 ? 0 : 1 }}
      />
    </div>
  );
}
