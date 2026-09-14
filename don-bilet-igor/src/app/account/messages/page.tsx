"use client";

import { useLk } from "@/lib/use-lk";
import type { LkMessage } from "@/lib/donbilet-api";

export default function MessagesPage() {
  const { status, data, error } = useLk<LkMessage[]>("/api/lk/messages");

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-heading font-semibold text-xl text-[#191919]">Сообщения</h2>
      {status === "loading" && <p className="text-[#757575]">Загружаем сообщения…</p>}
      {status === "error" && <p className="text-[#c0392b]">{error}</p>}
      {status === "ready" && (data?.length ?? 0) === 0 && (
        <p className="text-[#757575]">Новых сообщений нет.</p>
      )}
      {status === "ready" &&
        data?.map((m, i) => (
          <div key={i} className="bg-white rounded-3xl p-5 shadow-[0_2px_10px_rgba(25,25,25,0.06)]">
            <h3 className="font-heading font-semibold text-[#191919] mb-1">{m.header}</h3>
            <p className="text-sm text-[#757575] whitespace-pre-wrap break-words">{m.text}</p>
          </div>
        ))}
    </div>
  );
}
