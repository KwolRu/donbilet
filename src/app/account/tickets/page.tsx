"use client";

import { useLk } from "@/lib/use-lk";
import { TicketCard } from "@/components/account/TicketCard";
import type { Ticket } from "@/lib/donbilet-api";

export default function TicketsPage() {
  const { status, data, error } = useLk<Ticket[]>("/api/lk/tickets");

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-heading font-semibold text-xl text-[#191919]">Мои билеты</h2>
      {status === "loading" && <p className="text-[#757575]">Загружаем билеты…</p>}
      {status === "error" && <p className="text-[#c0392b]">{error}</p>}
      {status === "ready" && (data?.length ?? 0) === 0 && (
        <p className="text-[#757575]">Пока нет купленных билетов.</p>
      )}
      {status === "ready" &&
        data?.map((t) => <TicketCard key={t.ticketID} ticket={t} />)}
    </div>
  );
}
