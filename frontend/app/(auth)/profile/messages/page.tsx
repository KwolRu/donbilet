import type { Metadata } from "next";

import { NotificationsView } from "@/components/account/notifications/notifications-view";

export const metadata: Metadata = {
  title: "Уведомления — ДонБилет",
  description: "Уведомления сервиса и переписка с поддержкой.",
  robots: { index: false, follow: false },
};

export default function MessagesPage() {
  return <NotificationsView />;
}
