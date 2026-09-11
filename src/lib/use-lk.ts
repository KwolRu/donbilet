"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

type State<T> = { status: "loading" | "error" | "ready"; data: T | null; error?: string };

/** Загрузка данных ЛК из нашего /api/lk/* с редиректом на /login при 401. */
export function useLk<T>(url: string): State<T> & { reload: () => void } {
  const router = useRouter();
  const [state, setState] = useState<State<T>>({ status: "loading", data: null });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!active) return;
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        const json = await res.json();
        if (!active) return;
        if (!res.ok) {
          setState({ status: "error", data: null, error: json.error ?? "Ошибка загрузки." });
          return;
        }
        setState({ status: "ready", data: json.data as T });
      } catch {
        if (active) setState({ status: "error", data: null, error: "Нет связи с сервером." });
      }
    })();
    return () => {
      active = false;
    };
  }, [url, router, nonce]);

  // reload вызывается из обработчиков событий — меняем nonce, эффект перезапускается.
  const reload = useCallback(() => {
    setState((s) => ({ ...s, status: "loading" }));
    setNonce((n) => n + 1);
  }, []);

  return { ...state, reload };
}
