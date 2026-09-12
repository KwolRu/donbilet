"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";

import { useSiteReady } from "@app/core/hooks/use-site-ready";

/**
 * Появление части hero при открытии сайта.
 *
 * От `Reveal` отличается поводом: тот ждёт прокрутки, а hero виден сразу и
 * ждать ему нечего — он играет, как только уходит экран загрузки. Отсюда и
 * `useSiteReady`: запусти анимацию по монтированию, и она отыграет под
 * лоадером, а пользователь увидит уже собранный экран.
 *
 * Смещение больше, чем у секций ниже (24 против 16), и появление идёт
 * лесенкой: первый экран — единственное место, где анимация должна читаться
 * как вступление, а не как реакция на прокрутку.
 */

/** Страховка: сигнал о готовности не пришёл — hero всё равно должен появиться. */
const FALLBACK_DELAY = 3500;

/**
 * Пауза перед первым блоком. Экран загрузки уходит за 0.35с, и без неё начало
 * анимации играет ещё под ним — видно только её хвост.
 */
const BASE_DELAY = 0.3;

export function HeroReveal({
  children,
  delay = 0,
  from = "bottom",
  className,
}: {
  children: ReactNode;
  /** Задержка в секундах — для лесенки внутри hero. */
  delay?: number;
  /** Откуда выезжает: снизу — текст и форма, справа — автобус. */
  from?: "bottom" | "right";
  className?: string;
}) {
  const reduced = useReducedMotion();
  const siteReady = useSiteReady();
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setFallback(true), FALLBACK_DELAY);
    return () => window.clearTimeout(id);
  }, []);

  const play = reduced || siteReady || fallback;
  const hidden = from === "right" ? { opacity: 0, x: 48 } : { opacity: 0, y: 24 };

  return (
    <motion.div
      className={className}
      initial={reduced ? false : hidden}
      animate={play ? { opacity: 1, x: 0, y: 0 } : hidden}
      transition={
        reduced
          ? { duration: 0 }
          : { duration: 0.55, delay: BASE_DELAY + delay, ease: [0.22, 1, 0.36, 1] }
      }
    >
      {children}
    </motion.div>
  );
}
