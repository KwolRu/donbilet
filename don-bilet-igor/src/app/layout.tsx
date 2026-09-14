import type { Metadata } from "next";
import { Montserrat, Manrope } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin", "cyrillic"],
  weight: ["500", "600", "700", "800"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "ДонБилет — дешевые билеты на автобусы",
  description: "Здесь покупают дешевые билеты на автобусы, авиа, ЖД и отели",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`${montserrat.variable} ${manrope.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#faf8f2]">{children}</body>
    </html>
  );
}
