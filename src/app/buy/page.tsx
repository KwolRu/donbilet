import { Suspense } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { BuyFlow } from "@/components/buy/BuyFlow";

export default function BuyPage() {
  return (
    <div className="flex flex-col flex-1">
      <Header />
      <main className="flex-1 w-full max-w-[860px] mx-auto px-4 sm:px-6 py-8">
        <Suspense fallback={<p className="text-[#757575]">Загружаем оформление…</p>}>
          <BuyFlow />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
