"use client";

import { AnimatePresence } from "motion/react";
import { useEffect, useState } from "react";

import { LoadingScreen } from "./loading-screen";
import { markSiteReady } from "@app/core/hooks/use-site-ready";

/**
 * Экран загрузки публичного сайта.
 *
 * Держится ровно до готовности первого экрана: шрифты плюс картинки, которые
 * попадают в стартовый кадр (фон hero, автобус, логотип). Остальное к этому
 * моменту уже грузится параллельно — картинки лендинга отдаются без ленивой
 * загрузки, поэтому ждать их здесь незачем.
 *
 * Полоса прогресса показывает реальную долю готовых ресурсов, а не отсчёт по
 * таймеру. Два ограничителя не дают ей выглядеть обманом:
 *   MIN_VISIBLE — минимальный показ, иначе на быстрой сети экран моргает;
 *   MAX_VISIBLE — потолок ожидания: если картинка зависла, сайт всё равно
 *   открывается. Экран загрузки не должен становиться дверью на замке.
 *
 * Рендерится и на сервере: появись он только после гидратации — пользователь
 * увидел бы вспышку несобранной страницы, ровно то, ради чего он и заведён.
 */

const MIN_VISIBLE = 400;
const MAX_VISIBLE = 3000;

/** Сколько отдано за шрифты — остальное делится между картинками первого экрана. */
const FONTS_SHARE = 0.25;

export function SiteLoader() {
  const [visible, setVisible] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const startedAt = performance.now();
    let done = false;

    /** Скрывает экран, но не раньше, чем он побыл на виду MIN_VISIBLE. */
    function finish() {
      if (done) return;
      done = true;
      setProgress(1);

      const shownFor = performance.now() - startedAt;
      window.setTimeout(() => {
        setVisible(false);
        // Сигнал тем, кто появляется анимацией: экран открыт, можно играть.
        markSiteReady();
      }, Math.max(0, MIN_VISIBLE - shownFor));
    }

    /**
     * Картинки первого экрана. Берём те, что пересекают стартовый кадр: список
     * не приходится держать вручную и он не разъезжается с вёрсткой hero.
     */
    function firstScreenImages() {
      return [...document.querySelectorAll("img")].filter((img) => {
        const rect = img.getBoundingClientRect();
        return rect.top < window.innerHeight && rect.bottom > 0;
      });
    }

    const images = firstScreenImages();
    const total = images.length;

    let fontsReady = false;
    let loaded = images.filter((img) => img.complete).length;

    function update() {
      const imagesShare = total === 0 ? 1 : loaded / total;
      setProgress((fontsReady ? FONTS_SHARE : 0) + imagesShare * (1 - FONTS_SHARE));
      if (fontsReady && loaded >= total) finish();
    }

    function onImageSettled() {
      loaded += 1;
      update();
    }

    for (const img of images) {
      if (img.complete) continue;
      // `error` тоже считается: битая картинка не повод держать дверь закрытой.
      img.addEventListener("load", onImageSettled, { once: true });
      img.addEventListener("error", onImageSettled, { once: true });
    }

    document.fonts.ready.then(() => {
      fontsReady = true;
      update();
    });

    update();

    const timeout = window.setTimeout(finish, MAX_VISIBLE);

    return () => {
      window.clearTimeout(timeout);
      for (const img of images) {
        img.removeEventListener("load", onImageSettled);
        img.removeEventListener("error", onImageSettled);
      }
    };
  }, []);

  // Пока экран виден, страница под ним не должна прокручиваться.
  useEffect(() => {
    if (!visible) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && <LoadingScreen key="site-loader" progress={progress} label="Загрузка сайта" />}
    </AnimatePresence>
  );
}
