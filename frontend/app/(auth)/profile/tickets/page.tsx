import type { Metadata } from "next";

import { TicketsView } from "@/components/account/tickets/tickets-view";

export const metadata: Metadata = {
  title: "Мои билеты — ДонБилет",
  description: "Купленные билеты, оплата, возврат и история поездок.",
  robots: { index: false, follow: false },
};

export default function TicketsPage() {
  return <TicketsView />;
}
