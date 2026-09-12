import type { Metadata } from "next";

import { ProfileView } from "@/components/account/profile-view";

export const metadata: Metadata = {
  title: "Профиль — ДонБилет",
  description: "Личные данные, уведомления и активные сеансы.",
  robots: { index: false, follow: false },
};

export default function ProfilePage() {
  return <ProfileView />;
}
