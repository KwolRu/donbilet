export function PromoBanners() {
  return (
    <section className="site-shell py-3">
      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-5">
        <div className="relative bg-[#fdc003] rounded-3xl p-6 sm:p-8 min-h-[260px] overflow-hidden flex flex-col justify-between">
          <div className="relative z-10 flex flex-col gap-4 max-w-[420px]">
            <span className="inline-block w-fit bg-[#191919] text-[#8b7cf6] text-sm font-semibold px-4 py-1.5 rounded-full">
              Карта цен всего мира
            </span>
            <p className="font-sans text-lg sm:text-xl font-medium text-[#191919]">
              Когда нет цели, но есть желание путешествовать
            </p>
          </div>
          <button className="relative z-10 w-fit bg-white text-[#191919] font-heading font-semibold px-5 py-3 rounded-2xl hover:bg-[#f5f2e8] transition-colors">
            Открыть
          </button>

          <svg
            viewBox="0 0 260 200"
            className="absolute right-2 sm:right-6 bottom-0 w-[200px] sm:w-[280px] h-auto opacity-95"
            aria-hidden
          >
            <circle cx="140" cy="110" r="70" fill="#8b7cf6" />
            <path
              d="M70 110h140M140 40v140M85 65c25 18 75 18 100 0M85 155c25-18 75-18 100 0"
              stroke="#6c5ce7"
              strokeWidth="1.5"
              fill="none"
              opacity="0.6"
            />
            <path d="M55 60l120-18 18 10-110 24-28-16z" fill="#191919" />
            <path d="M75 75c0 8-7 16-7 16s-7-8-7-16a7 7 0 0 1 14 0z" fill="#191919" />
            <path d="M190 130c0 8-7 16-7 16s-7-8-7-16a7 7 0 0 1 14 0z" fill="#191919" />
            <path d="M120 165c0 8-7 16-7 16s-7-8-7-16a7 7 0 0 1 14 0z" fill="#e63946" />
          </svg>
        </div>

        <div className="relative bg-white rounded-3xl p-6 sm:p-8 min-h-[260px] overflow-hidden flex flex-col justify-between">
          <div className="flex flex-col gap-3 max-w-[70%]">
            <h3 className="font-heading font-semibold text-2xl text-[#191919]">Энциклопедия</h3>
            <p className="font-sans text-lg text-[#757575]">Частозадаваемые вопросы</p>
          </div>
          <button className="w-fit bg-[#ffc700] text-[#191919] font-sans font-semibold px-6 py-3 rounded-xl hover:bg-[#f0ba00] transition-colors">
            Перейти в раздел
          </button>

          <svg viewBox="0 0 160 130" className="absolute right-4 bottom-4 w-[140px] h-auto" aria-hidden>
            <rect x="10" y="45" width="30" height="65" rx="4" fill="#6c5ce7" />
            <rect x="45" y="32" width="30" height="78" rx="4" fill="#ffc700" />
            <rect x="80" y="50" width="30" height="60" rx="4" fill="#191919" />
            <circle cx="118" cy="62" r="24" fill="none" stroke="#8b7cf6" strokeWidth="7" />
            <line x1="136" y1="80" x2="152" y2="96" stroke="#8b7cf6" strokeWidth="8" strokeLinecap="round" />
          </svg>
        </div>
      </div>
    </section>
  );
}
