"use client";

import { motion } from "motion/react";

import { Logo } from "./logo";

/**
 * Экран загрузки: логотип и полоса прогресса на сплошном фоне.
 *
 * Один и тот же вид на два случая — первый заход на сайт (`SiteLoader`) и
 * переход между зонами с разными каркасами (`RouteLoader`). Держать их
 * раздельно нельзя: два похожих, но не одинаковых экрана загрузки читаются
 * как сбой, а не как одно приложение.
 *
 * Компонент только рисует. Чем считается прогресс и когда экран исчезает —
 * дело того, кто его показывает.
 */
export function LoadingScreen({ progress, label }: { progress: number; label: string }) {
  return (
    <motion.div
      // Экран не появляется, а только уходит: к моменту показа он уже на месте.
      initial={false}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-8 bg-db-surface-muted"
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <Logo asLink={false} width={200} />

      {/* Дорожка — #D9D9D9: на фоне #F6F6F6 более светлая просто не видна. */}
      <div className="h-1 w-[240px] overflow-hidden rounded-full bg-border-default">
        <motion.div
          className="h-full rounded-full bg-db-surface-base"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: progress }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          style={{ transformOrigin: "left center" }}
        />
      </div>
    </motion.div>
  );
}
