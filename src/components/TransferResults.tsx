"use client";

import type { TransferOption } from "@/lib/donbilet-api";

type Props = {
  status: "idle" | "loading" | "error" | "empty" | "success";
  options: TransferOption[];
  errorMessage?: string;
};

function fmtTransfer(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h} ч ${m} мин` : `${m} мин`;
}

export function TransferResults({ status, options, errorMessage }: Props) {
  if (status === "idle") return null;

  return (
    <div className="max-w-[900px] w-full mx-auto mt-4">
      <h3 className="font-heading font-semibold text-lg text-[#191919] mb-3">Маршруты с пересадкой</h3>

      {status === "loading" && (
        <div className="bg-white rounded-2xl p-6 text-center text-[#757575]">Подбираем варианты через хабы…</div>
      )}
      {status === "error" && (
        <div className="bg-white rounded-2xl p-6 text-center text-[#c0392b]">{errorMessage ?? "Ошибка поиска."}</div>
      )}
      {status === "empty" && (
        <div className="bg-white rounded-2xl p-6 text-center text-[#757575]">
          Подходящих маршрутов с пересадкой не найдено.
        </div>
      )}

      {status === "success" && (
        <div className="flex flex-col gap-3">
          {options.map((opt, i) => (
            <div key={i} className="bg-white rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-[#757575]">
                  Пересадка в г. {opt.hub} · {fmtTransfer(opt.transferMinutes)}
                </span>
                <span className="font-heading font-bold text-lg text-[#191919]">
                  {opt.totalCost != null ? `${opt.totalCost.toLocaleString("ru-RU")} ₽` : "Цена уточняется"}
                </span>
              </div>
              {opt.legs.map((leg, li) => (
                <div
                  key={li}
                  className={`flex items-center gap-4 py-2 ${li === 0 ? "border-b border-[#191919]/10" : ""}`}
                >
                  <div className="flex flex-col min-w-[52px]">
                    <span className="font-heading font-semibold text-[#191919]">{leg.depTime}</span>
                    <span className="font-heading font-semibold text-[#191919]">{leg.arrTime}</span>
                  </div>
                  <div className="flex flex-col text-xs text-[#757575] min-w-0 flex-1">
                    <span className="truncate">{leg.depCity} · {leg.depStation}</span>
                    <span className="truncate">{leg.arrCity} · {leg.arrStation}</span>
                  </div>
                  <div className="flex flex-col items-end text-xs text-[#757575]">
                    <span>{leg.tripTime}</span>
                    <span className="truncate max-w-[140px]">{leg.carrier}</span>
                  </div>
                </div>
              ))}
            </div>
          ))}
          <p className="text-xs text-[#757575]">
            MVP: перебор через крупные хабы (Москва, Ростов, Воронеж, Краснодар, Волгоград, Саратов, Самара). Полный
            граф пересадок — на следующем этапе.
          </p>
        </div>
      )}
    </div>
  );
}
