"use client";

import { useLk } from "@/lib/use-lk";
import { useLocalList } from "@/lib/local-store";
import type { Ticket } from "@/lib/donbilet-api";

// ТЗ п.8 — оценка перевозчика после поездки (звёзды, без публичных отзывов).
// Оцениваем только СВОИ завершённые поездки (в старом коде можно было оценить
// чужую — эту дыру закрываем: список берём из истории текущего пользователя).
type Rating = { ticketId: number; stars: number };

export default function RatingsPage() {
  const { status, data } = useLk<Ticket[]>("/api/lk/history");
  const [ratings, save] = useLocalList<Rating>("db_ratings");

  function setStars(ticketId: number, stars: number) {
    const rest = ratings.filter((r) => r.ticketId !== ticketId);
    save([...rest, { ticketId, stars }]);
  }
  const starsFor = (id: number) => ratings.find((r) => r.ticketId === id)?.stars ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-heading font-semibold text-xl text-[#191919]">Оценки перевозчиков</h2>
      <p className="text-sm text-[#757575]">Оцените поездку — оценки собираются для компании, публично не показываются.</p>
      {status === "loading" && <p className="text-[#757575]">Загружаем поездки…</p>}
      {status === "ready" && (data?.length ?? 0) === 0 && <p className="text-[#757575]">Пока нечего оценивать.</p>}
      {status === "ready" &&
        data?.map((t) => (
          <div key={t.ticketID} className="bg-white rounded-3xl p-5 shadow-[0_2px_10px_rgba(25,25,25,0.06)] flex items-center justify-between gap-3">
            <div>
              <p className="font-medium text-[#191919]">{t.raceName}</p>
              <p className="text-sm text-[#757575]">{t.arrCity}</p>
            </div>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setStars(t.ticketID, n)}
                  aria-label={`${n} звёзд`}
                  className={`text-2xl leading-none ${n <= starsFor(t.ticketID) ? "text-[#ffc700]" : "text-[#191919]/20"}`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}
