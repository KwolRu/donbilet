"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

/**
 * Тултип ДонБилет: тёмная плашка с хвостиком снизу по центру.
 *
 * По макету: фон #191919, подпись 14/20 белым, радиус 12 (токен `sm`), поля
 * 12/8. Хвостик — треугольник 12×6, вырезанный из того же цвета `clip-path`:
 * рисовать его рамками (`border-*-transparent`) нельзя, у плашки скруглённые
 * углы, и стык был бы виден.
 *
 * Позиционирует себя сам — абсолютно, над родителем: у вызывающего блока
 * должен быть `relative`. Хвостик всегда смотрит вниз, на элемент, к которому
 * подсказка относится.
 *
 * Появление и уход анимируются здесь же, поэтому снаружи достаточно обернуть
 * вызов в `AnimatePresence` и рендерить по условию.
 */
export function DbTooltip({
  children,
  role = "tooltip",
}: {
  children: ReactNode;
  /** `alert` — для сообщений об ошибке: их читает скринридер сразу. */
  role?: "tooltip" | "alert";
}) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      role={role}
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, y: 4 }}
      transition={{ duration: reduced ? 0 : 0.25, ease: [0.22, 1, 0.36, 1] }}
      /* `bottom-full` + отступ на высоту хвостика: плашка стоит над элементом. */
      className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 w-max max-w-full -translate-x-1/2"
    >
      <div className="squircle rounded-db-sm bg-db-surface-primary px-3 py-2 text-[14px] leading-5 text-db-text-inverse">
        {children}
      </div>

      {/*
       * Хвостик — квадрат, повёрнутый на 45° и наполовину задвинутый под
       * плашку: снаружи остаётся треугольник 12×6. Через `clip-path` кончик
       * получался бы идеально острым, а в макете он чуть скруглён — здесь это
       * обычный `border-radius` угла, который смотрит вниз.
       *
       * Сторона 8.5px — половина диагонали 12: именно она даёт нужную ширину
       * основания.
       */}
      <span
        aria-hidden
        className="absolute top-full left-1/2 size-[8.5px] -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-br-[2px] bg-db-surface-primary"
      />
    </motion.div>
  );
}
