"use client";

import { useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, Pause, Play, Volume2, VolumeX } from "lucide-react";

import { formatDuration } from "@app/core/mocks/notifications";

/**
 * Проигрыватель видео ДонБилет.
 *
 * Свой, а не системный `controls`: системная панель выглядит по-разному в
 * каждом браузере и не знает ни наших цветов, ни радиусов — в переписке она
 * читалась бы как чужая вставка.
 *
 * Что в нём есть и почему:
 *   нажатие по кадру — пауза и продолжение: самый частый жест, и тянуться
 *   к маленькой кнопке ради него не нужно;
 *   панель прячется во время просмотра и возвращается при движении мыши —
 *   иначе она закрывает нижнюю часть кадра;
 *   клавиши: пробел и K — пауза, стрелки — перемотка на 5 секунд, M — звук,
 *   F — во весь экран. Это привычный набор, и он работает, когда плеер в
 *   фокусе;
 *   полоса прогресса — `input[type=range]`: перетаскивание, клик по дорожке и
 *   управление клавишами достаются бесплатно и работают на тач-экранах.
 */
export function DbVideoPlayer({
  src,
  poster,
  className = "",
  autoPlay = false,
}: {
  src: string;
  poster?: string;
  className?: string;
  autoPlay?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<number | null>(null);

  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);

  /** Панель прячется только во время воспроизведения: на паузе она нужна. */
  function keepControls() {
    setControlsVisible(true);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    if (!playing) return;

    hideTimer.current = window.setTimeout(() => setControlsVisible(false), 2200);
  }

  /*
   * Смена воспроизведения только заводит таймер скрытия — показывать панель
   * из эффекта нельзя: синхронный setState в эффекте даёт лишний проход
   * рендера, а панель и так видима до первого запуска.
   */
  useEffect(() => {
    if (!playing) return;

    const timer = window.setTimeout(() => setControlsVisible(false), 2200);
    return () => window.clearTimeout(timer);
  }, [playing]);

  useEffect(
    () => () => {
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
    },
    [],
  );

  useEffect(() => {
    function onFullscreenChange() {
      setFullscreen(document.fullscreenElement === rootRef.current);
    }

    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  function toggle() {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) void video.play();
    else video.pause();
  }

  function seekBy(seconds: number) {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = Math.min(Math.max(0, video.currentTime + seconds), video.duration || 0);
  }

  async function toggleFullscreen() {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }
    await rootRef.current?.requestFullscreen();
  }

  function onKeyDown(event: React.KeyboardEvent) {
    const keys = [" ", "k", "K", "м", "л", "ArrowLeft", "ArrowRight", "m", "M", "ь", "f", "F", "а"];
    if (!keys.includes(event.key)) return;

    event.preventDefault();
    keepControls();

    if (event.key === " " || event.key.toLowerCase() === "k" || event.key === "л") toggle();
    if (event.key === "ArrowLeft") seekBy(-5);
    if (event.key === "ArrowRight") seekBy(5);
    if (event.key.toLowerCase() === "m" || event.key === "ь") setMuted((current) => !current);
    if (event.key.toLowerCase() === "f" || event.key === "а") void toggleFullscreen();
  }

  const progress = duration > 0 ? (current / duration) * 100 : 0;

  return (
    <div
      ref={rootRef}
      role="group"
      aria-label="Видео"
      tabIndex={0}
      onKeyDown={onKeyDown}
      onMouseMove={keepControls}
      onMouseLeave={() => playing && setControlsVisible(false)}
      className={
        "squircle group relative overflow-hidden rounded-db-md bg-db-surface-primary " +
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-db-surface-base " +
        className
      }
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        autoPlay={autoPlay}
        muted={muted}
        playsInline
        onClick={toggle}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(event) => setCurrent(event.currentTarget.currentTime)}
        onDurationChange={(event) => setDuration(event.currentTarget.duration || 0)}
        onEnded={() => setPlaying(false)}
        className="h-full w-full cursor-pointer object-contain"
      />

      {/*
       * Большая кнопка по центру — только на паузе: во время просмотра она
       * закрывала бы кадр, а нажатие и так работает по всему видео.
       */}
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Пауза" : "Воспроизвести"}
        className={
          "absolute inset-0 flex items-center justify-center transition-opacity duration-300 ease-db " +
          (playing ? "pointer-events-none opacity-0" : "opacity-100")
        }
      >
        <span className="flex size-16 items-center justify-center rounded-full bg-db-surface-base shadow-[0_8px_24px_rgba(0,0,0,0.25)] transition-transform duration-300 ease-db hover:scale-105">
          <Play className="ml-1 size-7 fill-db-text-primary text-db-text-primary" strokeWidth={2} />
        </span>
      </button>

      {/* Панель управления. Держится в разметке всегда и меняет прозрачность:
          подмена элемента заставляла бы её мигать при каждом движении мыши. */}
      <div
        className={
          "absolute inset-x-0 bottom-0 flex flex-col gap-1 bg-gradient-to-t from-black/75 to-transparent px-4 pt-8 pb-3 " +
          "transition-opacity duration-300 ease-db " +
          (controlsVisible ? "opacity-100" : "pointer-events-none opacity-0")
        }
      >
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={current}
          onChange={(event) => {
            const video = videoRef.current;
            if (!video) return;
            video.currentTime = Number(event.target.value);
          }}
          aria-label="Перемотка"
          className="db-video-range"
          style={{ backgroundSize: `${progress}% 100%` }}
        />

        <div className="flex items-center gap-3">
          <PlayerButton onClick={toggle} label={playing ? "Пауза" : "Воспроизвести"}>
            {playing ? (
              <Pause className="size-4 fill-current" strokeWidth={2} />
            ) : (
              <Play className="size-4 fill-current" strokeWidth={2} />
            )}
          </PlayerButton>

          <PlayerButton
            onClick={() => setMuted((value) => !value)}
            label={muted ? "Включить звук" : "Выключить звук"}
          >
            {muted ? <VolumeX className="size-4" strokeWidth={2} /> : <Volume2 className="size-4" strokeWidth={2} />}
          </PlayerButton>

          <span className="text-db-caption tabular-nums text-db-text-inverse">
            {formatDuration(current)} / {formatDuration(duration)}
          </span>

          <span className="flex-1" />

          <PlayerButton
            onClick={() => void toggleFullscreen()}
            label={fullscreen ? "Свернуть" : "Во весь экран"}
          >
            {fullscreen ? (
              <Minimize2 className="size-4" strokeWidth={2} />
            ) : (
              <Maximize2 className="size-4" strokeWidth={2} />
            )}
          </PlayerButton>
        </div>
      </div>
    </div>
  );
}

function PlayerButton({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex size-8 shrink-0 items-center justify-center rounded-full text-db-text-inverse transition-[background-color,transform] duration-300 ease-db hover:bg-white/15 active:scale-95"
    >
      {children}
    </button>
  );
}
