import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@assets/styles/index.css";
import { DeviceUnavailable } from "@/components/ui/device-unavailable";
import { RouteProgress } from "@/components/layout/route-progress";
import { RouteLoader } from "@/components/layout/route-loader";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
  display: "swap",
  fallback: ["system-ui", "arial"],
});

export const metadata: Metadata = {
  title: "DonBilet",
  description: "DonBilet",
  other: { charset: "utf-8" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {/*
         * Индикатор перехода — в корне: он общий для публичного сайта, кабинета
         * и CRM. А вот анимация смены страницы живёт в layout'ах зон, вокруг
         * `children`: её ключ по адресу перемонтирует поддерево, и в корне он
         * утаскивал бы за собой шапку, футер и боковое меню.
         */}
        <RouteProgress />
        {/*
         * Смена каркаса (лендинг ↔ вход и кабинет) проходит за тем же экраном
         * загрузки, что встречает на первом заходе. Внутри одной зоны он не
         * показывается — там достаточно полосы выше.
         */}
        <RouteLoader />
        {children}
        <DeviceUnavailable />
      </body>
    </html>
  );
}
