"use client";

import { useState } from "react";
import type { Ticket } from "@/lib/donbilet-api";

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}
function fmtDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}

export function TicketCard({ ticket, past = false }: { ticket: Ticket; past?: boolean }) {
  const [returning, setReturning] = useState(false);
  const [msg, setMsg] = useState<string>();

  async function refund() {
    if (!confirm("Оформить возврат этого билета?")) return;
    setReturning(true);
    setMsg(undefined);
    try {
      const res = await fetch("/api/lk/return", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId: ticket.ticketID }),
      });
      const data = await res.json();
      setMsg(res.ok ? "Возврат оформлен. Статус придёт в «Сообщения»." : data.error ?? "Не удалось оформить возврат.");
    } catch {
      setMsg("Нет связи с сервером.");
    } finally {
      setReturning(false);
    }
  }

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-[0_2px_10px_rgba(25,25,25,0.06)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-heading font-semibold text-lg text-[#191919]">{ticket.raceName}</h3>
          <p className="text-sm text-[#757575]">
            Заказ {ticket.orderName} · место {ticket.place}
          </p>
        </div>
        <span className="font-heading font-bold text-lg text-[#191919]">
          {ticket.totalTarif.toLocaleString("ru-RU")} ₽
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
        <div>
          <p className="font-heading font-semibold text-xl text-[#191919]">{fmtTime(ticket.depDateTime)}</p>
          <p className="text-sm text-[#757575]">{fmtDate(ticket.depDateTime)}</p>
          <p className="text-sm text-[#191919] mt-1">{ticket.depCity}</p>
          <p className="text-xs text-[#757575]">{ticket.depStation}</p>
        </div>
        <div className="sm:text-right">
          <p className="font-heading font-semibold text-xl text-[#191919]">{fmtTime(ticket.arrDateTime)}</p>
          <p className="text-sm text-[#757575]">{fmtDate(ticket.arrDateTime)}</p>
          <p className="text-sm text-[#191919] mt-1">{ticket.arrCity}</p>
          <p className="text-xs text-[#757575]">{ticket.arrStation}</p>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-[#191919]/10 text-sm text-[#757575]">
        Пассажир: {ticket.lName} {ticket.fName} {ticket.sName !== "-" ? ticket.sName : ""} · {ticket.docTypeName}{" "}
        {ticket.docNum} · {ticket.categoryName}
      </div>

      {msg && <p className="mt-3 text-sm text-[#191919]">{msg}</p>}

      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href={`/api/lk/ticket-pdf?ticketid=${ticket.ticketID}&uuid=${encodeURIComponent(ticket.uuid)}`}
          target="_blank"
          rel="noopener"
          className="px-4 py-2 rounded-xl border border-[#191919]/15 text-[#191919] font-medium hover:bg-[#faf8f2]"
        >
          Скачать PDF
        </a>
        {!past && ticket.isRefundable === "Y" && (
          <button
            onClick={refund}
            disabled={returning}
            className="px-4 py-2 rounded-xl bg-[#ffc700] text-[#191919] font-medium hover:bg-[#f0ba00] disabled:opacity-60"
          >
            {returning ? "Оформляем…" : "Вернуть билет"}
          </button>
        )}
        {past && (
          <a
            href={`/?repeat=${encodeURIComponent(ticket.depCity)}|${encodeURIComponent(ticket.arrCity)}`}
            className="px-4 py-2 rounded-xl bg-[#ffc700] text-[#191919] font-medium hover:bg-[#f0ba00]"
          >
            Повторить поездку
          </a>
        )}
      </div>
    </div>
  );
}
