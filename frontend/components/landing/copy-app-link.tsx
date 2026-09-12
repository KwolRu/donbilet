"use client";

import { useEffect, useState } from "react";

/**
 * «нажмите сюда» в секции мобильного приложения — копирует ссылку на установку.
 *
 * Ссылка пока мок: страницы приложений в сторах появятся вместе с публикацией
 * (фаза Ф10). Когда появятся — адрес переезжает в конфиг, разметка не меняется.
 */

const APP_LINK = "https://donbilet.ru/app";

export function CopyAppLink({ children }: { children: React.ReactNode }) {
  const [copied, setCopied] = useState(false);

  // Сбрасываем подтверждение через 2 с; таймер чистим, чтобы не писать в размонтированный компонент.
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(APP_LINK);
      setCopied(true);
    } catch {
      // Clipboard API недоступен (http-контекст, отказ в разрешении) — молча ничего не делаем.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="cursor-pointer text-db-text-primary underline underline-offset-2 transition-colors hover:text-db-text-secondary"
    >
      {copied ? "ссылка скопирована" : children}
    </button>
  );
}
