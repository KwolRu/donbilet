import type { Metadata } from "next";

import { OrderView } from "@/components/order/order-view";

export const metadata: Metadata = {
  title: "Выбор места — ДонБилет",
  description: "Выберите места в автобусе и перейдите к данным пассажиров.",
};

export default function OrderPage() {
  return <OrderView />;
}
