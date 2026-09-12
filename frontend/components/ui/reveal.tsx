"use client";

import { motion, useAnimationControls, useReducedMotion } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";

/**
 * Появление блока при прокрутке.
 *
 * Блок выезжает снизу и проявляется один раз — повторная анимация при
 * обратной прокрутке раздражает и мешает читать.
 *
 * Момент запуска важнее самой анимации. Секция высотой в пол-экрана
 * пересекает нижнюю границу окна задолго до того, как на неё смотрят: если
 * начать там, к моменту, когда пользователь до секции долистал, анимация уже
 * отыграна и он видит статичный блок. Поэтому запуск сдвинут внутрь экрана на
 * `TRIGGER_INSET` — блок начинает появляться, когда действительно попадает в
 * поле зрения.
 *
 * Раньше здесь была ещё эвристика «при быстрой прокрутке показывать сразу, без
 * анимации». Её убрали: обычное колесо даёт 3000–5000px/с, то есть порог
 * срабатывал почти всегда и анимации не было нигде. `once: true` и так
 * гарантирует, что догонять полупрозрачные блоки придётся не дольше одного
 * появления.
 *
 * При `prefers-reduced-motion` анимации нет вообще — блок сразу на месте.
 * Возвращать `null`-обёртку в этом случае нельзя: разметка должна совпадать
 * с серверной, иначе гидратация ругается.
 */

/**
 * Насколько блок должен войти в экран, чтобы начать появляться. Значение —
 * доля высоты окна, отрезаемая снизу от области наблюдения.
 */
const TRIGGER_INSET = "-18%";

export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  /** Задержка в секундах — для лесенки внутри одной секции. */
  delay?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const controls = useAnimationControls();
  const ref = useRef<HTMLDivElement>(null);
  const revealed = useRef(false);

  function show(instant: boolean) {
    if (revealed.current) return;
    revealed.current = true;

    controls.start({
      opacity: 1,
      y: 0,
      transition: instant ? { duration: 0 } : { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] },
    });
  }

  useEffect(() => {
    if (reduced) {
      show(true);
      return;
    }

    /*
     * Страница могла открыться с сохранённой позицией — тогда блоки выше
     * экрана в кадр уже не попадут, и без этой проверки они навсегда остались
     * бы прозрачными.
     */
    const rect = ref.current?.getBoundingClientRect();
    if (rect && rect.bottom < 0) show(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced]);

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={reduced ? false : { opacity: 0, y: 24 }}
      animate={controls}
      viewport={{ once: true, margin: `0px 0px ${TRIGGER_INSET} 0px` }}
      onViewportEnter={() => show(false)}
    >
      {children}
    </motion.div>
  );
}
