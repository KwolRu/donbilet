import type { Metadata } from "next";

import { FavoritesView } from "@/components/account/favorites/favorites-view";

export const metadata: Metadata = {
  title: "Избранное — ДонБилет",
  description: "Сохранённые направления и рейсы.",
  robots: { index: false, follow: false },
};

export default function FavoritesPage() {
  return <FavoritesView />;
}
