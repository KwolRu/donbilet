"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

/**
 * Выпадающая панель ДонБилет: список городов, календарь, пассажиры, меню
 * кабинета.
 *
 * Одна анимация на все панели — иначе каждая выпадашка открывается по-своему.
 * Панель мягко раскрывается от кнопки маской и коротким сдвигом. Масштабировать
 * всю панель нельзя: вместе с ней тянутся текст и строки списка, из-за чего
 * пункты визуально «дёргаются». Закрытие короче открытия, чтобы не ощущаться
 * как задержка.
 *
 * `transform-origin` задаётся снаружи: панель «Кто едет» прижата к правому
 * краю поля, и расти она должна из правого верхнего угла, а не из левого.
 *
 * Сам факт открытия хранит `usePopover` — здесь только показ. Панель остаётся
 * в DOM на время exit-анимации (`AnimatePresence`), поэтому клик вне и Escape
 * продолжают работать как раньше.
 */
export function DbPopoverPanel({
  open,
  className,
  origin = "top left",
  children,
}: {
  open: boolean;
  className?: string;
  /** CSS `transform-origin` — угол, из которого разворачивается панель. */
  origin?: string;
  children: ReactNode;
}) {
  const reduced = useReducedMotion();

  const hidden = reduced
    ? { opacity: 0 }
    : { opacity: 0, y: -4, clipPath: "inset(0 0 8% 0 round 12px)" };
  const shown = reduced
    ? { opacity: 1 }
    : { opacity: 1, y: 0, clipPath: "inset(0 0 0% 0 round 12px)" };

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          initial={hidden}
          animate={{
            ...shown,
            transition: {
              duration: reduced ? 0.12 : 0.18,
              ease: [0.16, 1, 0.3, 1],
            },
          }}
          exit={{
            ...hidden,
            transition: {
              duration: reduced ? 0.08 : 0.11,
              ease: [0.4, 0, 1, 1],
            },
          }}
          style={{ transformOrigin: origin }}
          className={className}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
