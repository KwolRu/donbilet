import Link from "next/link";
import { Logo } from "./Logo";

export function Header() {
  return (
    <header className="bg-white">
      <div className="site-wide py-4 flex items-center justify-between gap-6">
        <Link href="/">
          <Logo />
        </Link>
        <nav className="hidden md:flex items-center gap-4 lg:gap-6">
          <Link
            href="#"
            className="text-base font-semibold font-sans text-[#191919] px-4 py-2.5 lg:px-6 lg:py-3 rounded-xl hover:bg-[#faf8f2] transition-colors"
          >
            Связаться с нами
          </Link>
          <Link
            href="#"
            className="hidden lg:block text-base font-semibold font-sans text-[#191919] px-6 py-3 rounded-xl border border-[#191919]/15 hover:bg-[#faf8f2] transition-colors"
          >
            ДонБилет Юр лицам
          </Link>
          <Link
            href="#"
            className="text-base font-semibold font-sans text-[#191919] bg-[#ffc700] px-4 py-2.5 lg:px-6 lg:py-3 rounded-xl hover:bg-[#f0ba00] transition-colors"
          >
            Войти в личный кабинет
          </Link>
        </nav>
      </div>
    </header>
  );
}
