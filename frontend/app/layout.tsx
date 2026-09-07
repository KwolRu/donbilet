import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@assets/styles/index.css";
import { DeviceUnavailable } from "@/components/ui/device-unavailable";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
  display: "swap",
  fallback: ["system-ui", "arial"],
});

export const metadata: Metadata = {
  title: "__APP_NAME__",
  description: "__APP_NAME__",
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
        {children}
        <DeviceUnavailable />
      </body>
    </html>
  );
}
