"use client";

import { useEffect, useState } from "react";
import { useLk } from "@/lib/use-lk";
import type { UserInfo } from "@/lib/donbilet-api";

export default function ProfilePage() {
  const { status, data, error, reload } = useLk<UserInfo>("/api/lk/profile");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string>();

  useEffect(() => {
    // Засев редактируемого поля из асинхронно загруженных данных профиля.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (data?.phone) setPhone(data.phone);
  }, [data]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setNotice(undefined);
    try {
      const body: { phone?: string; credData?: string } = { phone };
      if (password) body.credData = password;
      const res = await fetch("/api/lk/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (res.ok) {
        setNotice("Изменения сохранены.");
        setPassword("");
        reload();
      } else {
        setNotice(json.error ?? "Не удалось сохранить.");
      }
    } catch {
      setNotice("Нет связи с сервером.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-heading font-semibold text-xl text-[#191919]">Профиль</h2>
      {status === "loading" && <p className="text-[#757575]">Загружаем данные…</p>}
      {status === "error" && <p className="text-[#c0392b]">{error}</p>}
      {status === "ready" && data && (
        <form onSubmit={save} className="bg-white rounded-3xl p-6 shadow-[0_2px_10px_rgba(25,25,25,0.06)] flex flex-col gap-4 max-w-[480px]">
          <label className="flex flex-col gap-1">
            <span className="text-sm text-[#757575]">Email (изменить нельзя)</span>
            <input
              value={data.email}
              readOnly
              className="px-4 py-3 rounded-2xl border border-[#191919]/10 bg-[#faf8f2] text-[#757575]"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-[#757575]">Телефон</span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="px-4 py-3 rounded-2xl border border-[#191919]/15 outline-none focus:border-[#ffc700] text-[#191919]"
              placeholder="9XXXXXXXXX"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-[#757575]">Новый пароль (оставьте пустым, чтобы не менять)</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="px-4 py-3 rounded-2xl border border-[#191919]/15 outline-none focus:border-[#ffc700] text-[#191919]"
              placeholder="••••••••"
            />
          </label>
          {notice && <p className="text-sm text-[#191919]">{notice}</p>}
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-3 bg-[#ffc700] rounded-2xl font-semibold text-[#191919] hover:bg-[#f0ba00] disabled:opacity-60 w-fit"
          >
            {saving ? "Сохраняем…" : "Сохранить"}
          </button>
        </form>
      )}
    </div>
  );
}
