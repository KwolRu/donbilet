const FEATURES = [
  {
    title: "Настоящая поддержка",
    text: "Отвечаем быстро и качественно. У нас прямая связь с авиакомпаниями",
    art: (
      <svg viewBox="0 0 100 80" className="w-24 h-auto" aria-hidden>
        <circle cx="50" cy="34" r="26" fill="#8b7cf6" />
        <path d="M24 34a26 26 0 0 1 52 0" stroke="#191919" strokeWidth="5" fill="none" />
        <rect x="18" y="32" width="11" height="20" rx="4.5" fill="#191919" />
        <rect x="71" y="32" width="11" height="20" rx="4.5" fill="#191919" />
        <rect x="10" y="54" width="26" height="17" rx="7" fill="#ffc700" />
        <circle cx="18" cy="62.5" r="1.7" fill="#191919" />
        <circle cx="23" cy="62.5" r="1.7" fill="#191919" />
        <circle cx="28" cy="62.5" r="1.7" fill="#191919" />
      </svg>
    ),
  },
  {
    title: "Всё и сразу",
    text: "Не надо выбирать быстро или дёшево, самолётом или поездом. Здесь всё и сразу",
    art: (
      <svg viewBox="0 0 100 80" className="w-24 h-auto" aria-hidden>
        <path
          d="M20 22h7l7 36h38l7-27H33"
          stroke="#191919"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="39" cy="66" r="5" fill="#191919" />
        <circle cx="67" cy="66" r="5" fill="#191919" />
        <rect x="38" y="6" width="18" height="22" rx="3" fill="#e63946" transform="rotate(-8 47 17)" />
        <rect x="56" y="8" width="18" height="22" rx="3" fill="#6c5ce7" transform="rotate(8 65 19)" />
      </svg>
    ),
  },
  {
    title: "Билеты по всему миру",
    text: "Продаём билеты в любую точку земного шара. Оплата картами разных стран",
    art: (
      <svg viewBox="0 0 100 80" className="w-24 h-auto" aria-hidden>
        <circle cx="50" cy="38" r="30" fill="#8b7cf6" />
        <path
          d="M19 38h62M50 8v60M26 20c16 11 48 11 64 0M26 56c16-11 48-11 64 0"
          stroke="#191919"
          strokeWidth="1.6"
          fill="none"
          opacity="0.7"
        />
        <circle cx="77" cy="17" r="8" fill="#ffc700" />
      </svg>
    ),
  },
];

export function Features() {
  return (
    <section className="site-shell py-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {FEATURES.map((f) => (
          <div key={f.title} className="relative bg-white rounded-3xl p-6 sm:p-8 min-h-[210px] overflow-hidden">
            <div className="flex flex-col gap-3 max-w-[75%] relative z-10">
              <h3 className="font-heading font-semibold text-xl sm:text-2xl text-[#191919]">{f.title}</h3>
              <p className="font-sans text-base sm:text-lg text-[#757575] leading-relaxed">{f.text}</p>
            </div>
            <div className="absolute right-5 bottom-5 opacity-90">{f.art}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
