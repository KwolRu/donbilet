"use client";

import { motion, useReducedMotion } from "motion/react";

/**
 * Заставка на время поиска и смены фильтров.
 *
 * Нужна не ради красоты: список перестраивается за доли секунды, и без
 * промежуточного состояния подмена карточек выглядит как сбой — было одно,
 * стало другое, без объяснения. Заставка занимает то же место, что и список,
 * поэтому страница не подпрыгивает.
 *
 * Три «карточки» — столько обычно и помещается в первый экран; больше рисовать
 * нет смысла, ниже их всё равно не видно.
 */
export function TicketsSearching() {
  const reduced = useReducedMotion();

  return (
    <div className="flex flex-col gap-4" role="status" aria-live="polite">
      <div className="flex items-center gap-3 px-1">
        {/* Точки бегут по очереди — короткий цикл, чтобы не гипнотизировать. */}
        <span className="flex items-center gap-1" aria-hidden>
          {[0, 1, 2].map((index) => (
            <motion.span
              key={index}
              className="size-1.5 rounded-full bg-db-surface-base"
              animate={reduced ? undefined : { opacity: [0.25, 1, 0.25] }}
              transition={{
                duration: 1.1,
                repeat: Infinity,
                delay: index * 0.15,
                ease: "easeInOut",
              }}
            />
          ))}
        </span>

        <span className="text-db-body text-db-text-secondary">
          Собираем данные по вашим поездкам
        </span>
      </div>

      {[0, 1, 2].map((index) => (
        <motion.div
          key={index}
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduced ? 0 : 0.3, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
          className="squircle flex items-stretch overflow-hidden rounded-db-xl"
        >
          {/* Левая половина — как у карточки: номера, маршрут, время. */}
          <div className="flex flex-1 gap-4 bg-db-surface-default p-6 outline outline-1 -outline-offset-1 outline-db-border-subtle">
            <div className="flex w-44 shrink-0 flex-col gap-3 border-r border-db-border-subtle pr-4">
              <Bar className="h-5 w-28 rounded-full" />
              <Bar className="h-4 w-24" />
              <Bar className="h-4 w-20" />
            </div>

            <div className="flex flex-1 flex-col gap-4">
              <Bar className="h-6 w-72" />
              <Bar className="h-8 w-full" />
              <Bar className="h-20 w-full rounded-db-md" />
            </div>
          </div>

          {/* Правая — корешок. Тёмный, чтобы силуэт совпадал с настоящим. */}
          <div className="flex w-[280px] shrink-0 flex-col justify-between gap-4 bg-db-surface-primary p-6">
            <div className="flex flex-col gap-3">
              <Bar className="h-5 w-24 rounded-full bg-white/15" />
              <Bar className="h-10 w-40 bg-white/15" />
              <Bar className="h-16 w-full bg-white/10" />
            </div>
            <Bar className="h-10 w-full rounded-db-sm bg-white/15" />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/** Полоса-заглушка. Пульсация одна на все — из Tailwind, без своей анимации. */
function Bar({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={"block animate-pulse rounded-db-xs bg-db-surface-muted motion-reduce:animate-none " + className}
    />
  );
}
