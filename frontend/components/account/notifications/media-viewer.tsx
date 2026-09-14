"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronLeft, ChevronRight, Download, X } from "lucide-react";

import { DbVideoPlayer } from "@/components/ui/db-video-player";
import { formatFileSize, type MessageAttachment } from "@app/core/mocks/notifications";

/**
 * Просмотр вложения во весь экран.
 *
 * Открывается по нажатию на превью в переписке. Листается стрелками — и на
 * экране, и на клавиатуре: если к сообщению приложили пять фотографий,
 * закрывать просмотр ради каждой следующей бессмысленно.
 *
 * Живёт в портале: у ленты сообщений своя прокрутка и свои слои, и просмотр,
 * отрисованный внутри пузыря, оказался бы обрезан ею.
 *
 * Прокрутка страницы под просмотром выключается — иначе фон уезжает, пока
 * листаешь галерею.
 */
export function MediaViewer({
  items,
  index,
  onClose,
  onIndexChange,
}: {
  items: MessageAttachment[];
  /** `null` — просмотр закрыт. */
  index: number | null;
  onClose: () => void;
  onIndexChange: (next: number) => void;
}) {
  const reduced = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  /*
   * Флаг клиента для портала: ставится в следующем кадре, а не синхронно в
   * эффекте — синхронный setState запускает каскадный рендер. Просмотрщик
   * монтируется вместе со страницей, поэтому кадр задержки никто не видит.
   */
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (index === null) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") step(-1);
      if (event.key === "ArrowRight") step(1);
    }

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, items.length]);

  function step(direction: -1 | 1) {
    if (index === null || items.length === 0) return;
    // По кругу: на последнем кадре «вперёд» возвращает к первому.
    onIndexChange((index + direction + items.length) % items.length);
  }

  if (!mounted) return null;

  const item = index === null ? null : items[index];

  return createPortal(
    <AnimatePresence>
      {item && (
        <motion.div
          initial={reduced ? { opacity: 0 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0 : 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[120] flex flex-col bg-black/85 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={item.name}
          onClick={onClose}
        >
          <header className="flex shrink-0 items-center justify-between gap-4 p-6">
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-db-item font-medium text-db-text-inverse">
                {item.name}
              </span>
              <span className="text-db-caption text-db-text-tertiary">
                {formatFileSize(item.size)}
                {items.length > 1 && index !== null ? ` · ${index + 1} из ${items.length}` : ""}
              </span>
            </div>

            <div className="flex shrink-0 items-center gap-2" onClick={(e) => e.stopPropagation()}>
              {item.url && (
                <a
                  href={item.url}
                  download={item.name}
                  aria-label="Скачать"
                  title="Скачать"
                  className="flex size-10 items-center justify-center rounded-full text-db-text-inverse transition-[background-color,transform] duration-300 ease-db hover:bg-white/15 active:scale-95"
                >
                  <Download className="size-5" strokeWidth={1.5} aria-hidden />
                </a>
              )}

              <button
                type="button"
                onClick={onClose}
                aria-label="Закрыть"
                className="flex size-10 items-center justify-center rounded-full text-db-text-inverse transition-[background-color,transform] duration-300 ease-db hover:bg-white/15 hover:rotate-90 active:scale-95"
              >
                <X className="size-5" strokeWidth={2} aria-hidden />
              </button>
            </div>
          </header>

          <div
            className="relative flex min-h-0 flex-1 items-center justify-center px-16 pb-8"
            onClick={(event) => event.stopPropagation()}
          >
            {/*
             * Ключ по индексу: при листании кадр сменяется анимацией, а не
             * подменой `src` — иначе между кадрами мелькает пустое место,
             * пока грузится следующий файл.
             */}
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={index}
                initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
                transition={{ duration: reduced ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="flex max-h-full max-w-full items-center justify-center"
              >
                {item.kind === "video" && item.url ? (
                  <DbVideoPlayer
                    src={item.url}
                    poster={item.poster}
                    autoPlay
                    className="max-h-[78vh] w-[min(1100px,90vw)]"
                  />
                ) : item.url ? (
                  // Обычный `img`, а не `next/image`: у вложения нет заранее
                  // известных размеров, а своё изображение и вовсе живёт в
                  // `blob:` — оптимизировать там нечего.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.url}
                    alt={item.name}
                    className="squircle max-h-[78vh] max-w-full rounded-db-md object-contain"
                  />
                ) : (
                  <p className="text-db-body text-db-text-tertiary">
                    Этот файл нельзя показать — скачайте его, чтобы открыть.
                  </p>
                )}
              </motion.div>
            </AnimatePresence>

            {items.length > 1 && (
              <>
                <ViewerArrow side="left" onClick={() => step(-1)} />
                <ViewerArrow side="right" onClick={() => step(1)} />
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function ViewerArrow({ side, onClick }: { side: "left" | "right"; onClick: () => void }) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === "left" ? "Предыдущее вложение" : "Следующее вложение"}
      className={
        "absolute top-1/2 flex size-12 -translate-y-1/2 items-center justify-center rounded-full " +
        "bg-white/10 text-db-text-inverse backdrop-blur " +
        "transition-[background-color,transform] duration-300 ease-db hover:bg-white/20 active:scale-95 " +
        (side === "left" ? "left-4" : "right-4")
      }
    >
      <Icon className="size-6" strokeWidth={1.5} aria-hidden />
    </button>
  );
}
