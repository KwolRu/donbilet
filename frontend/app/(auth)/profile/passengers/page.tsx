import type { Metadata } from "next";

import { PassengersView } from "@/components/account/passengers/passengers-view";

export const metadata: Metadata = {
  title: "Пассажиры — ДонБилет",
  description: "Сохранённые пассажиры и их документы для быстрой покупки билетов.",
  robots: { index: false, follow: false },
};

export default function PassengersPage() {
  return <PassengersView />;
}
