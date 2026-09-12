"use client";

import { motion, useReducedMotion } from "motion/react";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Мягкое проявление контента при смене страницы.
 *
 * `key={pathname}` монтирует поддерево заново — без этого motion не увидит
 * смену страницы и анимация не проиграет. Отсюда важное правило: оборачивать
 * можно только контентную область, но не каркас.
 *
 * В корне layout'а этот компонент стоять не должен. Там его ключ утаскивает за
 * собой шапку, футер и боковое меню: они пересоздаются на каждом переходе,
 * теряют состояние (открытое меню, позицию прокрутки) и мигают, хотя меняется
 * только середина экрана. Поэтому обёртка живёт внутри `(public)/layout.tsx` и
 * `(auth)/layout.tsx` — вокруг `children`, уже под каркасом.
 *
 * Длительность намеренно короткая: переход должен смягчать подмену контента,
 * а не задерживать её. При `prefers-reduced-motion` анимации нет вовсе.
 */
export function PageTransition({
  children,
  className = "flex min-h-full flex-1 flex-col",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      key={pathname}
      ref={useScrollReset(pathname)}
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.22, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Возврат прокрутки к началу при смене страницы.
 *
 * Позицию окна восстанавливает сам Next, но в кабинете прокручивается не окно,
 * а рабочая область: раньше она обнулялась побочно — вместе с пересозданием
 * каркаса. Теперь каркас живёт дольше страницы, и новый раздел открывался бы
 * прокрученным до середины предыдущего.
 */
function useScrollReset(pathname: string) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let node = ref.current?.parentElement ?? null;

    while (node) {
      const { overflowY } = getComputedStyle(node);
      if ((overflowY === "auto" || overflowY === "scroll") && node.scrollHeight > node.clientHeight) {
        node.scrollTop = 0;
        return;
      }
      node = node.parentElement;
    }
  }, [pathname]);

  return ref;
}
