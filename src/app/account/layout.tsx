import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AccountNav } from "@/components/account/AccountNav";
import { getSession } from "@/lib/session";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="flex flex-col flex-1">
      <Header />
      <main className="flex-1 w-full max-w-[1200px] mx-auto px-4 sm:px-6 py-8">
        <h1 className="font-heading font-bold text-2xl sm:text-3xl text-[#191919] mb-6">Личный кабинет</h1>
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          <aside className="bg-white rounded-3xl p-3 h-fit shadow-[0_2px_10px_rgba(25,25,25,0.06)]">
            <AccountNav />
          </aside>
          <section className="min-w-0">{children}</section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
