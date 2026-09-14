"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(undefined);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loginName: email, credData: password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Не удалось войти.");
        return;
      }
      router.push("/account/tickets");
      router.refresh();
    } catch {
      setError("Нет связи с сервером.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col flex-1">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-[420px] bg-white rounded-3xl p-6 sm:p-8 shadow-[0_7px_24px_rgba(25,25,25,0.1)]">
          <h1 className="font-heading font-bold text-2xl text-[#191919] mb-1">Вход в личный кабинет</h1>
          <p className="text-[#757575] mb-6">Билеты, история поездок и возвраты — в одном месте.</p>

          <form onSubmit={submit} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1">
              <span className="text-sm text-[#757575]">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="px-4 py-3 rounded-2xl border border-[#191919]/15 outline-none focus:border-[#ffc700] text-[#191919]"
                placeholder="you@example.com"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-[#757575]">Пароль</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="px-4 py-3 rounded-2xl border border-[#191919]/15 outline-none focus:border-[#ffc700] text-[#191919]"
                placeholder="••••••••"
              />
            </label>

            {error && <p className="text-sm text-[#c0392b]">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 px-5 py-3 bg-[#ffc700] rounded-2xl font-semibold text-[#191919] hover:bg-[#f0ba00] disabled:opacity-60"
            >
              {loading ? "Входим…" : "Войти"}
            </button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <span className="h-px flex-1 bg-[#191919]/10" />
            <span className="text-xs text-[#757575]">или</span>
            <span className="h-px flex-1 bg-[#191919]/10" />
          </div>

          {/* ТЗ п.9 — вход через VK / Яндекс. Ждём OAuth-ключи от Заказчика. */}
          <div className="flex flex-col gap-2">
            <button
              disabled
              title="Появится после подключения OAuth (ТЗ п.9)"
              className="px-5 py-3 rounded-2xl border border-[#191919]/15 text-[#757575] font-medium cursor-not-allowed"
            >
              Войти через VK ID · скоро
            </button>
            <button
              disabled
              title="Появится после подключения OAuth (ТЗ п.9)"
              className="px-5 py-3 rounded-2xl border border-[#191919]/15 text-[#757575] font-medium cursor-not-allowed"
            >
              Войти через Яндекс · скоро
            </button>
          </div>

          <p className="text-sm text-[#757575] mt-6 text-center">
            Нет аккаунта?{" "}
            <Link href="/register" className="text-[#191919] font-medium underline">
              Зарегистрироваться
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
