"use client";

import { useState } from "react";
import { useLocalList } from "@/lib/local-store";

// ТЗ п.6 — до 10 сохранённых пассажиров, подстановка при заказе.
// Черновик на localStorage: заменяется на /api/lk/passengers, когда появится backend.
type Passenger = {
  id: string;
  lName: string;
  fName: string;
  sName: string;
  bDay: string;
  sex: "М" | "Ж";
  docNum: string;
};

const EMPTY: Omit<Passenger, "id"> = { lName: "", fName: "", sName: "", bDay: "", sex: "М", docNum: "" };

export default function PassengersPage() {
  const [list, save] = useLocalList<Passenger>("db_passengers");
  const [form, setForm] = useState(EMPTY);

  function add(e: React.FormEvent) {
    e.preventDefault();
    if (list.length >= 10) return;
    save([...list, { ...form, id: crypto.randomUUID() }]);
    setForm(EMPTY);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading font-semibold text-xl text-[#191919]">Пассажиры</h2>
        <span className="text-sm text-[#757575]">{list.length} / 10</span>
      </div>
      <p className="text-sm text-[#757575]">
        Сохранённые пассажиры подставляются при покупке билета. Черновик — данные хранятся в этом браузере до
        подключения серверного хранилища.
      </p>

      {list.map((p) => (
        <div key={p.id} className="bg-white rounded-3xl p-5 shadow-[0_2px_10px_rgba(25,25,25,0.06)] flex items-center justify-between gap-3">
          <div>
            <p className="font-medium text-[#191919]">
              {p.lName} {p.fName} {p.sName}
            </p>
            <p className="text-sm text-[#757575]">
              {p.bDay} · {p.sex} · {p.docNum}
            </p>
          </div>
          <button
            onClick={() => save(list.filter((x) => x.id !== p.id))}
            className="text-[#c0392b] text-sm hover:underline"
          >
            Удалить
          </button>
        </div>
      ))}

      {list.length < 10 && (
        <form onSubmit={add} className="bg-white rounded-3xl p-5 shadow-[0_2px_10px_rgba(25,25,25,0.06)] grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input required placeholder="Фамилия" value={form.lName} onChange={(e) => setForm({ ...form, lName: e.target.value })} className="px-4 py-3 rounded-2xl border border-[#191919]/15 outline-none focus:border-[#ffc700]" />
          <input required placeholder="Имя" value={form.fName} onChange={(e) => setForm({ ...form, fName: e.target.value })} className="px-4 py-3 rounded-2xl border border-[#191919]/15 outline-none focus:border-[#ffc700]" />
          <input placeholder="Отчество" value={form.sName} onChange={(e) => setForm({ ...form, sName: e.target.value })} className="px-4 py-3 rounded-2xl border border-[#191919]/15 outline-none focus:border-[#ffc700]" />
          <input required placeholder="Дата рождения ДД.ММ.ГГГГ" value={form.bDay} onChange={(e) => setForm({ ...form, bDay: e.target.value })} className="px-4 py-3 rounded-2xl border border-[#191919]/15 outline-none focus:border-[#ffc700]" />
          <select value={form.sex} onChange={(e) => setForm({ ...form, sex: e.target.value as "М" | "Ж" })} className="px-4 py-3 rounded-2xl border border-[#191919]/15 outline-none focus:border-[#ffc700]">
            <option value="М">Мужской</option>
            <option value="Ж">Женский</option>
          </select>
          <input required placeholder="Документ (серия/номер)" value={form.docNum} onChange={(e) => setForm({ ...form, docNum: e.target.value })} className="px-4 py-3 rounded-2xl border border-[#191919]/15 outline-none focus:border-[#ffc700]" />
          <button type="submit" className="sm:col-span-2 px-5 py-3 bg-[#ffc700] rounded-2xl font-semibold text-[#191919] hover:bg-[#f0ba00] w-fit">
            Добавить пассажира
          </button>
        </form>
      )}
    </div>
  );
}
