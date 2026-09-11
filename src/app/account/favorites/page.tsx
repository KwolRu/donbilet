"use client";

import { useState } from "react";
import { useLocalList } from "@/lib/local-store";

// ТЗ п.5 — избранные направления (город А→Б без даты). Черновик на localStorage
// до backend (/api/lk/favorites) и уведомлений о цене (ТЗ п.24).
type Favorite = { id: string; from: string; to: string };

export default function FavoritesPage() {
  const [list, save] = useLocalList<Favorite>("db_favorites");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  function add(e: React.FormEvent) {
    e.preventDefault();
    if (!from || !to) return;
    save([...list, { id: crypto.randomUUID(), from, to }]);
    setFrom("");
    setTo("");
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-heading font-semibold text-xl text-[#191919]">Избранные направления</h2>
      <p className="text-sm text-[#757575]">
        Сохраняйте частые маршруты. Позже сюда добавим письма о снижении цены (ТЗ п.24).
      </p>

      {list.map((f) => (
        <div key={f.id} className="bg-white rounded-3xl p-5 shadow-[0_2px_10px_rgba(25,25,25,0.06)] flex items-center justify-between gap-3">
          <a href={`/?from=${encodeURIComponent(f.from)}&to=${encodeURIComponent(f.to)}`} className="font-medium text-[#191919] hover:underline">
            {f.from} → {f.to}
          </a>
          <button onClick={() => save(list.filter((x) => x.id !== f.id))} className="text-[#c0392b] text-sm hover:underline">
            Удалить
          </button>
        </div>
      ))}

      <form onSubmit={add} className="bg-white rounded-3xl p-5 shadow-[0_2px_10px_rgba(25,25,25,0.06)] flex flex-col sm:flex-row gap-3">
        <input placeholder="Откуда" value={from} onChange={(e) => setFrom(e.target.value)} className="flex-1 px-4 py-3 rounded-2xl border border-[#191919]/15 outline-none focus:border-[#ffc700]" />
        <input placeholder="Куда" value={to} onChange={(e) => setTo(e.target.value)} className="flex-1 px-4 py-3 rounded-2xl border border-[#191919]/15 outline-none focus:border-[#ffc700]" />
        <button type="submit" className="px-5 py-3 bg-[#ffc700] rounded-2xl font-semibold text-[#191919] hover:bg-[#f0ba00]">
          Добавить
        </button>
      </form>
    </div>
  );
}
