"use client";

import { useState } from "react";
import { ArrowUpRightIcon } from "./Icons";

export function Stats() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setSent(true);
    setEmail("");
  }

  return (
    <section className="site-shell py-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white rounded-3xl p-6 sm:p-8 flex flex-col gap-3">
          <span className="font-heading font-semibold text-3xl text-[#191919]">32 000 000</span>
          <p className="font-sans text-lg text-[#757575]">Пассажиров перевезли за всё время</p>
        </div>

        <div className="bg-white rounded-3xl p-6 sm:p-8 flex flex-col gap-3">
          <div className="flex items-end justify-between">
            <span className="font-heading font-semibold text-3xl text-[#191919]">900</span>
            <div className="flex">
              <span className="w-8 h-8 rounded-full bg-[#ffc700]" />
              <span className="w-8 h-8 rounded-full bg-[#001dff] -ml-3 border-2 border-white" />
              <span className="w-8 h-8 rounded-full bg-[#ff0000] -ml-3 border-2 border-white" />
            </div>
          </div>
          <p className="font-sans text-lg text-[#757575]">Авиакомпаний работает с нами</p>
        </div>

        <div className="bg-white rounded-3xl p-6 sm:p-8 flex flex-col gap-3">
          <span className="font-heading font-semibold text-3xl text-[#191919]">14 лет</span>
          <p className="font-sans text-lg text-[#757575]">С нами путешествуют по всему миру</p>
        </div>

        <div className="bg-white rounded-3xl p-6 sm:p-8 flex flex-col gap-3">
          <p className="font-sans text-lg text-[#757575]">Подпишись на рассылку, там выгодные предложения</p>
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={sent ? "Спасибо!" : "Эл почта"}
              className="flex-1 min-w-0 h-12 px-4 rounded-xl border border-[#191919]/15 text-base font-sans font-light outline-none"
            />
            <button
              type="submit"
              aria-label="Подписаться"
              className="w-12 h-12 shrink-0 rounded-2xl bg-[#ffc700] flex items-center justify-center hover:bg-[#f0ba00] transition-colors"
            >
              <ArrowUpRightIcon className="w-5 h-5 text-[#191919]" />
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
