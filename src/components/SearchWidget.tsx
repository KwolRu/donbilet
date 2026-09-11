"use client";

import { useEffect, useRef, useState } from "react";
import { BusIcon, PlaneIcon, TrainIcon, HotelIcon, PinIcon, CalendarIcon, ChevronDownIcon, SwapIcon } from "./Icons";
import { BusResults } from "./BusResults";
import { TransferResults } from "./TransferResults";
import type { BusResult, SearchResponse } from "@/lib/bus-search";
import type { TransferOption } from "@/lib/donbilet-api";

const TABS = [
  { id: "bus", label: "Автобус", icon: BusIcon },
  { id: "avia", label: "Авиа", icon: PlaneIcon },
  { id: "train", label: "ЖД", icon: TrainIcon },
  { id: "hotel", label: "Отели", icon: HotelIcon },
] as const;

type CitySuggestion = { id: number; name: string; region: string };

function isoToDdMmYyyy(iso: string): string {
  const [yyyy, mm, dd] = iso.split("-");
  return `${dd}.${mm}.${yyyy}`;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Поле города с живым автокомплитом против боевого справочника Донбилета. */
function CityField({
  label,
  placeholder,
  text,
  onTextChange,
  onSelect,
  dir,
  fromId,
}: {
  label: string;
  placeholder: string;
  text: string;
  onTextChange: (s: string) => void;
  onSelect: (c: CitySuggestion | null) => void;
  dir: "departure" | "arrival";
  fromId?: number;
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<CitySuggestion[]>([]);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const params = new URLSearchParams({ q: text, dir });
    if (dir === "arrival" && fromId) params.set("from", String(fromId));
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/cities?${params.toString()}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((d) => setItems(d.cities ?? []))
        .catch(() => {});
    }, 150);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [text, open, dir, fromId]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={boxRef} className="relative flex items-center gap-4 flex-1 min-w-0 px-4 lg:px-6 py-3">
      <PinIcon className="w-6 h-6 text-[#191919] shrink-0" />
      <div className="flex flex-col min-w-0 flex-1">
        <span className="text-base lg:text-xl text-[#757575] font-normal">{label}</span>
        <input
          value={text}
          onChange={(e) => {
            onTextChange(e.target.value);
            onSelect(null);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="text-base lg:text-xl font-medium text-[#191919] placeholder:text-[#757575] outline-none bg-transparent min-w-0"
        />
      </div>
      {open && items.length > 0 && (
        <ul className="absolute top-full left-0 z-20 mt-1 w-[320px] max-h-72 overflow-auto bg-white rounded-2xl shadow-[0_7px_24px_rgba(25,25,25,0.18)] py-2">
          {items.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelect(c);
                  onTextChange(c.name);
                  setOpen(false);
                }}
                className="w-full text-left px-4 py-2 hover:bg-[#faf8f2]"
              >
                <span className="font-medium text-[#191919]">{c.name}</span>
                <span className="block text-xs text-[#757575]">{c.region}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function SearchWidget() {
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]["id"]>("bus");
  const [from, setFrom] = useState<CitySuggestion | null>(null);
  const [to, setTo] = useState<CitySuggestion | null>(null);
  const [fromText, setFromText] = useState("");
  const [toText, setToText] = useState("");
  const [date, setDate] = useState(todayIso());
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "empty" | "success">("idle");
  const [results, setResults] = useState<BusResult[]>([]);
  const [nextDate, setNextDate] = useState<string | null>(null);
  const [minCost, setMinCost] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>();

  const [transferStatus, setTransferStatus] = useState<"idle" | "loading" | "error" | "empty" | "success">("idle");
  const [transferOptions, setTransferOptions] = useState<TransferOption[]>([]);
  const [transferError, setTransferError] = useState<string>();

  async function runTransferSearch(searchDate: string) {
    if (!from || !to) return;
    setTransferStatus("loading");
    setTransferError(undefined);
    try {
      const params = new URLSearchParams({
        fromId: String(from.id),
        toId: String(to.id),
        date: isoToDdMmYyyy(searchDate),
      });
      const res = await fetch(`/api/search-transfers?${params.toString()}`);
      const data: { options?: TransferOption[]; error?: string } = await res.json();
      if (!res.ok) {
        setTransferStatus("error");
        setTransferError(data.error ?? "Не удалось выполнить поиск.");
        return;
      }
      setTransferOptions(data.options ?? []);
      setTransferStatus((data.options ?? []).length > 0 ? "success" : "empty");
    } catch {
      setTransferStatus("error");
      setTransferError("Не удалось связаться с сервером поиска.");
    }
  }

  function swap() {
    setFrom(to);
    setTo(from);
    setFromText(toText);
    setToText(fromText);
  }

  async function runSearch(searchDate: string) {
    if (!from || !to) {
      setStatus("error");
      setErrorMessage("Выберите города отправления и назначения из подсказок.");
      return;
    }
    setStatus("loading");
    setErrorMessage(undefined);
    setTransferStatus("idle");
    setTransferOptions([]);
    try {
      const params = new URLSearchParams({
        from: from.name,
        to: to.name,
        fromId: String(from.id),
        toId: String(to.id),
        date: isoToDdMmYyyy(searchDate),
      });
      const res = await fetch(`/api/search-buses?${params.toString()}`);
      const data: SearchResponse & { error?: string } = await res.json();
      if (!res.ok) {
        setStatus("error");
        setErrorMessage(data.error ?? "Не удалось выполнить поиск.");
        return;
      }
      setResults(data.results ?? []);
      setNextDate(data.nextDate ?? null);
      setMinCost(data.minCost ?? null);
      setStatus((data.results ?? []).length > 0 ? "success" : "empty");
    } catch {
      setStatus("error");
      setErrorMessage("Не удалось связаться с сервером поиска.");
    }
  }

  function handleSearch() {
    if (activeTab !== "bus") {
      setStatus("error");
      setErrorMessage("Живой поиск подключён для автобусов. Разделы Авиа/ЖД/Отели — в разработке по ТЗ.");
      return;
    }
    void runSearch(date);
  }

  return (
    <div className="w-full max-w-[1160px] mx-auto">
      <div className="flex flex-col items-center">
        <div className="relative z-10 bg-white rounded-t-[28px] sm:rounded-t-[32px] px-4 sm:px-6 pt-4 sm:pt-6 pb-3 shadow-[0_-1px_8px_rgba(25,25,25,0.05)]">
          <div className="flex gap-px overflow-x-auto no-scrollbar">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const active = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-col items-center gap-1 w-[110px] sm:w-[152px] px-4 py-2 whitespace-nowrap transition-colors ${
                    active ? "bg-[#ffc700] rounded-2xl" : "rounded-3xl hover:bg-[#faf8f2]"
                  }`}
                >
                  <Icon className={`w-6 h-6 ${active ? "text-[#191919]" : "text-[#757575]"}`} />
                  <span
                    className={`font-heading font-semibold text-base lg:text-xl ${active ? "text-[#191919]" : "text-[#757575]"}`}
                  >
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="h-px bg-[#191919]/20 mt-3" />
        </div>

        <div className="w-full -mt-px bg-white rounded-[28px] sm:rounded-[32px] lg:rounded-[24px] px-4 sm:px-6 lg:px-10 py-3 shadow-[0_7px_10px_rgba(25,25,25,0.25)] flex flex-col lg:flex-row items-stretch lg:items-center">
          <CityField
            label="Откуда"
            placeholder="Введите город"
            text={fromText}
            onTextChange={setFromText}
            onSelect={setFrom}
            dir="departure"
          />

          <button
            type="button"
            onClick={swap}
            aria-label="Поменять местами"
            className="hidden lg:flex items-center justify-center w-12 h-12 rounded-full border border-[#191919]/20 bg-white shrink-0 hover:bg-[#faf8f2]"
          >
            <SwapIcon className="w-6 h-6 text-[#191919]" />
          </button>

          <CityField
            label="Куда"
            placeholder="Введите город"
            text={toText}
            onTextChange={setToText}
            onSelect={setTo}
            dir="arrival"
            fromId={from?.id}
          />

          <button className="flex items-center gap-4 lg:gap-6 px-4 lg:px-6 py-3 border-t lg:border-t-0 lg:border-l border-[#191919]/20 text-left">
            <div className="flex flex-col">
              <span className="text-base lg:text-xl font-medium text-[#191919]">1 пассажир</span>
              <span className="text-base lg:text-xl font-medium text-[#757575]">Эконом</span>
            </div>
            <ChevronDownIcon className="w-6 h-6 text-[#191919] shrink-0" />
          </button>

          <label className="flex items-center gap-4 lg:gap-6 px-4 lg:px-6 py-3 border-t lg:border-t-0 lg:border-l border-[#191919]/20 text-left cursor-pointer">
            <CalendarIcon className="w-6 h-6 text-[#191919] shrink-0" />
            <div className="flex flex-col min-w-0">
              <input
                type="date"
                value={date}
                min={todayIso()}
                onChange={(e) => setDate(e.target.value)}
                className="text-base lg:text-xl font-medium text-[#191919] outline-none bg-transparent min-w-0"
              />
              <span className="text-base lg:text-xl font-medium text-[#757575]">Туда</span>
            </div>
          </label>

          <button
            onClick={handleSearch}
            disabled={status === "loading"}
            className="m-2 lg:ml-4 px-5 py-3 bg-[#ffc700] rounded-[20px] font-semibold text-base lg:text-xl text-[#191919] hover:bg-[#f0ba00] transition-colors shrink-0 lg:w-[290px] lg:h-14 disabled:opacity-60"
          >
            {status === "loading" ? "Ищем…" : "Найти билеты"}
          </button>
        </div>
      </div>

      <BusResults
        status={status}
        results={results}
        errorMessage={errorMessage}
        nextDate={nextDate}
        minCost={minCost}
        onPickNextDate={(iso) => {
          setDate(iso);
          void runSearch(iso);
        }}
      />

      {/* ТЗ п.27 — поиск с пересадкой. Доступен после прямого поиска. */}
      {(status === "success" || status === "empty") && transferStatus === "idle" && (
        <div className="max-w-[900px] w-full mx-auto mt-4 text-center">
          <button
            onClick={() => void runTransferSearch(date)}
            className="px-5 py-3 rounded-2xl border border-[#191919]/15 bg-white font-semibold text-[#191919] hover:bg-[#faf8f2]"
          >
            {status === "empty" ? "Нет прямых рейсов — искать с пересадкой" : "Показать маршруты с пересадкой"}
          </button>
        </div>
      )}

      <TransferResults status={transferStatus} options={transferOptions} errorMessage={transferError} />
    </div>
  );
}
