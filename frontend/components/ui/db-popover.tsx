"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

/**
 * Выпадающая панель ДонБилет: список городов, календарь, пассажиры, меню
 * кабинета.
 *
 * Одна анимация на все панели — иначе каждая выпадашка открывается по-своему.
 * Появление: проявление + сдвиг на 8px от кнопки + лёгкое увеличение от 0.97.
 * Исчезновение — то же самое в обратную сторону и быстрее (150 против 220мс):
 * закрытие не должно ощущаться как задержка.
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

  const hidden = reduced ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.97 };
  const shown = reduced ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 };

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          initial={hidden}
          animate={shown}
          exit={hidden}
          transition={{
            duration: reduced ? 0 : 0.22,
            ease: [0.22, 1, 0.36, 1],
            // Закрытие короче открытия.
            opacity: { duration: reduced ? 0 : 0.15 },
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
