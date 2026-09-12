"use client";

import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { StaticImageData } from "next/image";

/**
 * Галерея внутри статьи.
 *
 * По макету: снимок во всю ширину колонки, стрелки вынесены за её края и
 * полоски прогресса под картинкой — по одной на кадр, активная тёмная.
 *
 * Полоски кликабельны: в макете это просто индикатор, но раз он показывает
 * позицию, естественно ожидать перехода по нажатию — иначе элемент выглядит
 * интерактивным и не отвечает.
 */
export function NewsGallery({ images }: { images: StaticImageData[] }) {
  const [index, setIndex] = useState(0);
  // Направление перелистывания: кадр уезжает в ту сторону, откуда пришёл новый.
  const [direction, setDirection] = useState<1 | -1>(1);
  const reduced = useReducedMotion();

  function go(step: 1 | -1) {
    setDirection(step);
    setIndex((current) => (current + step + images.length) % images.length);
  }

  return (
    <div className="relative flex w-full flex-col gap-2">
      <div className="squircle relative aspect-[600/364] w-full overflow-hidden rounded-db-lg bg-db-surface-muted">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.div
            key={index}
            initial={reduced ? { opacity: 0 } : { opacity: 0, x: direction * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, x: direction * -40 }}
            transition={{ duration: reduced ? 0 : 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0"
          >
            <Image
              src={images[index]}
              alt=""
              fill
              sizes="600px"
              className="object-cover"
              loading="eager"
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Полоски прогресса: их ровно столько, сколько кадров. */}
      <div className="flex items-center gap-2">
        {images.map((_, position) => (
          <button
            key={position}
            type="button"
            aria-label={`Кадр ${position + 1} из ${images.length}`}
            aria-current={position === index}
            onClick={() => {
              setDirection(position > index ? 1 : -1);
              setIndex(position);
            }}
            className="group flex-1 py-2"
          >
            <span
              className={
                "block h-1 w-full rounded-full transition-colors duration-300 ease-out " +
                (position === index
                  ? "bg-db-text-primary"
                  : "bg-db-border-default group-hover:bg-db-text-tertiary")
              }
            />
          </button>
        ))}
      </div>

      {/*
       * Стрелки вынесены за колонку текста — как в макете. `-left-5`/`-right-5`
       * ставят их ровно на границу, а вертикальный центр берётся от картинки,
       * а не от всего блока: иначе полоски прогресса смещали бы их вниз.
       */}
      <GalleryArrow side="left" onClick={() => go(-1)} />
      <GalleryArrow side="right" onClick={() => go(1)} />
    </div>
  );
}

function GalleryArrow({ side, onClick }: { side: "left" | "right"; onClick: () => void }) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === "left" ? "Предыдущий кадр" : "Следующий кадр"}
      className={
        "squircle absolute top-[calc(50%-24px)] flex -translate-y-1/2 items-center justify-center " +
        "rounded-db-sm bg-db-surface-primary p-3 outline outline-1 -outline-offset-1 outline-db-border-subtle " +
        "transition-[background-color,transform] duration-300 ease-out hover:bg-black active:scale-90 " +
        (side === "left" ? "-left-5" : "-right-5")
      }
    >
      <Icon className="size-4 text-db-text-inverse" strokeWidth={1.5} aria-hidden />
    </button>
  );
}
