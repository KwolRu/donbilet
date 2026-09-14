import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { Destinations } from "@/components/Destinations";
import { InfoMosaic } from "@/components/InfoMosaic";
import { AppPromo } from "@/components/AppPromo";
import { BusinessPromo } from "@/components/BusinessPromo";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <div className="flex flex-col flex-1">
      <Header />
      <main className="flex flex-col flex-1">
        <Hero />
        <Destinations />
        <InfoMosaic />
        <AppPromo />
        <BusinessPromo />
      </main>
      <Footer />
    </div>
  );
}
