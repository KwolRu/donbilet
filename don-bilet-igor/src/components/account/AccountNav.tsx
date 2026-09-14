"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Ticket, History, MessageSquare, User, Star, Users, Heart, LogOut } from "lucide-react";

const LINKS = [
  { href: "/account/tickets", label: "Мои билеты", icon: Ticket },
  { href: "/account/history", label: "История поездок", icon: History },
  { href: "/account/favorites", label: "Избранное", icon: Heart },
  { href: "/account/passengers", label: "Пассажиры", icon: Users },
  { href: "/account/messages", label: "Сообщения", icon: MessageSquare },
  { href: "/account/ratings", label: "Оценки перевозчиков", icon: Star },
  { href: "/account/profile", label: "Профиль", icon: User },
];

export function AccountNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/account/login");
    router.refresh();
  }

  return (
    <nav className="flex flex-col gap-1">
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-medium transition-colors ${
              active ? "bg-[#ffc700] text-[#191919]" : "text-[#191919] hover:bg-[#faf8f2]"
            }`}
          >
            <Icon className="w-5 h-5 shrink-0" />
            <span>{label}</span>
          </Link>
        );
      })}
      <button
        onClick={logout}
        className="flex items-center gap-3 px-4 py-3 rounded-2xl font-medium text-[#c0392b] hover:bg-[#faf8f2] transition-colors mt-2"
      >
        <LogOut className="w-5 h-5 shrink-0" />
        <span>Выйти</span>
      </button>
    </nav>
  );
}
