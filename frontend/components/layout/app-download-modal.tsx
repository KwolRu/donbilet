"use client";

import Image from "next/image";
import { useEffect } from "react";
import { motion, useReducedMotion } from "motion/react";
import { X } from "lucide-react";

import modalArt from "@assets/images/common/modals/image.png";
import { MobileAppCopy } from "@/components/landing/mobile-app-copy";

/**
 * Модальное окно «Скачать приложение» из шапки.
 *
 * Левая часть — готовая иллюстрация 725×520 из макета (телефон, QR и логотип
 * уже сведены в ней). Собирать её из слоёв не нужно: в Figma это одна картинка,
 * и любая пересборка разойдётся с макетом.
 *
 * Размеры карточки — 1220×520; справа колонка текста 431px с полем 32px.
 */
export function AppDownloadModal({ onClose }: { onClose: () => void }) {
  const reduced = useReducedMotion();

  // Escape закрывает; прокрутка фона блокируется, иначе страница едет под окном.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Скачать приложение ДонБилет"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(25,25,25,0.60)] px-8"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduced ? 0 : 0.25, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div
        // Клик внутри карточки не должен закрывать окно.
        onClick={(event) => event.stopPropagation()}
        className="squircle relative flex h-[520px] w-[1220px] items-center gap-8 overflow-hidden rounded-db-2xl bg-db-surface-default"
        initial={reduced ? false : { opacity: 0, y: 16, scale: 0.98 }}
        animate={reduced ? undefined : { opacity: 1, y: 0, scale: 1 }}
        exit={reduced ? undefined : { opacity: 0, y: 16, scale: 0.98 }}
        transition={{ duration: reduced ? 0 : 0.32, ease: [0.22, 1, 0.36, 1] }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрыть"
          className="absolute top-8 right-8 transition-opacity duration-300 ease-out hover:opacity-60"
        >
          <X className="size-6 text-db-text-primary" strokeWidth={1.5} aria-hidden />
        </button>

        <Image
          src={modalArt}
          alt="Мобильное приложение ДонБилет: QR-код на экране телефона"
          width={725}
          height={520}
          priority
          className="h-[520px] w-[725px] shrink-0 object-cover"
        />

        <div className="w-[431px] pr-8">
          <MobileAppCopy />
        </div>
      </motion.div>
    </motion.div>
  );
}
