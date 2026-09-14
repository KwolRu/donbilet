"use client";

import { useState } from "react";
import { Download, FileText, Play } from "lucide-react";

import { MediaViewer } from "./media-viewer";
import {
  formatDuration,
  formatFileSize,
  type MessageAttachment,
} from "@app/core/mocks/notifications";

/**
 * Вложения внутри пузыря сообщения.
 *
 * Фото и видео показываются превью, документы — плашкой с именем и размером:
 * предпросмотр PDF в переписке всё равно нечитаем, а плашка сразу говорит,
 * что файл нужно скачать.
 *
 * Медиа выкладываются сеткой: одно вложение занимает всю ширину пузыря, два и
 * больше — по два в ряд. Так одна фотография читается, а пять не превращают
 * сообщение в ленту высотой в экран.
 *
 * Нажатие открывает просмотрщик, и листать в нём можно только медиа: с
 * документом там делать нечего.
 */
export function MessageAttachments({ items }: { items: MessageAttachment[] }) {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const media = items.filter((item) => item.kind !== "file" && item.url);
  const files = items.filter((item) => item.kind === "file" || !item.url);

  return (
    <div className="flex flex-col gap-2">
      {media.length > 0 && (
        <div className={"grid gap-2 " + (media.length === 1 ? "grid-cols-1" : "grid-cols-2")}>
          {media.map((item, index) => (
            <button
              key={`${item.name}-${index}`}
              type="button"
              onClick={() => setViewerIndex(index)}
              aria-label={
                item.kind === "video" ? `Смотреть видео ${item.name}` : `Открыть фото ${item.name}`
              }
              className={
                "squircle group relative overflow-hidden rounded-db-sm bg-db-surface-primary " +
                "transition-transform duration-300 ease-db active:scale-[0.99] " +
                (media.length === 1 ? "h-56" : "h-36")
              }
            >
              {/* Превью — `img` и для видео тоже: постер грузится быстрее, чем
                  первый кадр ролика, и лента не ждёт загрузки видео.
                  eslint-disable-next-line @next/next/no-img-element */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.kind === "video" ? (item.poster ?? item.url) : item.url}
                alt={item.name}
                className="h-full w-full object-cover transition-transform duration-500 ease-db group-hover:scale-105"
              />

              {item.kind === "video" && (
                <>
                  <span
                    className="absolute inset-0 bg-db-text-primary/25 transition-colors duration-300 ease-db group-hover:bg-db-text-primary/10"
                    aria-hidden
                  />

                  <span className="absolute inset-0 flex items-center justify-center" aria-hidden>
                    <span className="flex size-12 items-center justify-center rounded-full bg-db-surface-base shadow-[0_6px_18px_rgba(0,0,0,0.25)] transition-transform duration-300 ease-db group-hover:scale-110">
                      <Play
                        className="ml-0.5 size-5 fill-db-text-primary text-db-text-primary"
                        strokeWidth={2}
                      />
                    </span>
                  </span>

                  {item.duration !== undefined && (
                    <span className="absolute right-2 bottom-2 rounded-full bg-black/60 px-2 py-0.5 text-db-chip text-db-text-inverse">
                      {formatDuration(item.duration)}
                    </span>
                  )}
                </>
              )}
            </button>
          ))}
        </div>
      )}

      {files.map((item, index) => (
        <div
          key={`${item.name}-${index}`}
          className="squircle flex items-center gap-3 rounded-db-sm bg-db-surface-default p-3 outline outline-1 -outline-offset-1 outline-db-border-subtle"
        >
          <span className="squircle flex size-10 shrink-0 items-center justify-center rounded-db-xs bg-db-surface-muted">
            <FileText className="size-5 text-db-text-secondary" strokeWidth={1.5} aria-hidden />
          </span>

          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-db-caption text-db-text-primary">{item.name}</span>
            <span className="text-db-micro text-db-text-secondary">{formatFileSize(item.size)}</span>
          </span>

          {item.url && (
            <a
              href={item.url}
              download={item.name}
              aria-label={`Скачать ${item.name}`}
              className="flex size-8 shrink-0 items-center justify-center rounded-full text-db-text-secondary transition-[background-color,color] duration-300 ease-db hover:bg-db-surface-muted hover:text-db-text-primary"
            >
              <Download className="size-4" strokeWidth={1.5} aria-hidden />
            </a>
          )}
        </div>
      ))}

      <MediaViewer
        items={media}
        index={viewerIndex}
        onClose={() => setViewerIndex(null)}
        onIndexChange={setViewerIndex}
      />
    </div>
  );
}
