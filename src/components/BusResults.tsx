"use client";

import type { BusResult } from "@/lib/bus-search";

type Props = {
  status: "idle" | "loading" | "error" | "empty" | "success";
  results: BusResult[];
  errorMessage?: string;
  nextDate: string | null;
  minCost: string | null;
  onPickNextDate: (iso: string) => void;
};

// ДД.ММ.ГГГГ (как отдает WSv2 в nextdate уже ГГГГ-ММ-ДД) → ISO для input[type=date]
function nextDateToIso(d: string): string {
  // API отдает nextdate в формате ГГГГ-ММ-ДД
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(d);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : d;
}

function humanDate(d: string): string {
  const iso = nextDateToIso(d);
  const dt = new Date(iso);
  return Number.isNaN(dt.getTime())
    ? d
    : dt.toLocaleDateString("ru-RU", { day: "numeric", month: "long", weekday: "short" });
}

export function BusResults({ status, results, errorMessage, nextDate, minCost, onPickNextDate }: Props) {
  if (status === "idle") return null;

  return (
    <div className="max-w-[900px] w-full mx-auto mt-4">
      {status === "loading" && (
        <div className="bg-white rounded-2xl p-6 text-center text-[#757575] font-sans">Ищем рейсы…</div>
      )}

      {status === "error" && (
        <div className="bg-white rounded-2xl p-6 text-center text-[#c0392b] font-sans">
          {errorMessage ?? "Не удалось выполнить поиск."}
        </div>
      )}

      {status === "empty" && (
        <div className="bg-white rounded-2xl p-6 text-center text-[#757575] font-sans">
          <p>Рейсов на выбранную дату нет.</p>
          {nextDate && (
            <button
              onClick={() => onPickNextDate(nextDateToIso(nextDate))}
              className="mt-3 px-4 py-2 bg-[#ffc700] rounded-xl font-semibold text-[#191919] hover:bg-[#f0ba00]"
            >
              Ближайшие рейсы — {humanDate(nextDate)}
              {minCost ? ` · от ${Math.round(Number(minCost)).toLocaleString("ru-RU")} ₽` : ""}
            </button>
          )}
        </div>
      )}

      {status === "success" && (
        <div className="flex flex-col gap-3">
          {results.map((r, i) => (
            <div
              key={`${r.scheduleID}-${i}`}
              className="bg-white rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
            >
              <div className="flex items-center gap-5">
                <div className="flex flex-col">
                  <span className="font-heading font-semibold text-lg text-[#191919]">{r.depTime}</span>
                  <span className="text-xs text-[#757575] max-w-[140px] truncate" title={r.stationDepName}>
                    {r.stationDepName}
                  </span>
                </div>
                <div className="flex flex-col items-center text-[#757575]">
                  <span className="text-xs">{r.tripTime} в пути</span>
                  <span className="w-16 h-px bg-[#191919]/20 my-1" />
                </div>
                <div className="flex flex-col">
                  <span className="font-heading font-semibold text-lg text-[#191919]">{r.arrTime}</span>
                  <span className="text-xs text-[#757575] max-w-[140px] truncate" title={r.stationArrName}>
                    {r.stationArrName}
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:items-end gap-1">
                <span className="text-sm text-[#757575] max-w-[220px] truncate" title={r.carrier}>
                  {r.carrier}
                </span>
                <span className="text-xs" style={{ color: r.placesColor?.startsWith("#") ? r.placesColor : undefined }}>
                  Свободно мест: {r.places}
                </span>
                <span className="font-heading font-bold text-lg text-[#191919]">
                  {r.cost != null ? `${r.cost.toLocaleString("ru-RU")} ₽` : "Цена уточняется"}
                </span>
                <a
                  href={`/buy?scheduleid=${r.scheduleID}&person=1`}
                  className="mt-1 px-4 py-2 rounded-xl bg-[#ffc700] text-[#191919] font-semibold hover:bg-[#f0ba00] text-center"
                >
                  Купить
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
