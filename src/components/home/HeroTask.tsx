import { useEffect, useState } from "react";

const REQUIREMENTS = ["Qidiruv debounce bilan: bitta so'rov", "Saralash va aria-sort", "Server tomonda sahifalash"];
const START = 3 * 3600 + 42 * 60 + 17;

const pad = (n: number) => String(n).padStart(2, "0");
const clock = (s: number) => `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;

/**
 * Bosh sahifadagi asosiy element: ishlayotgan task — taymer sanaydi,
 * talablar birin-ketin bajariladi va mentor bahosi chiqadi.
 */
export default function HeroTask() {
  const [left, setLeft] = useState(START);
  const [done, setDone] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    const steps = REQUIREMENTS.map((_, i) => setTimeout(() => setDone(i + 1), 900 + i * 750));
    return () => {
      clearInterval(t);
      steps.forEach(clearTimeout);
    };
  }, []);

  const reviewed = done === REQUIREMENTS.length;

  return (
    <div className="relative w-full max-w-[460px] mx-auto lg:mx-0" aria-label="Task namunasi">
      <div className="rounded-[22px] border border-line bg-surface shadow-[0_30px_80px_-30px_rgba(7,10,19,0.35)] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-line bg-mist/60">
          <div className="flex items-center gap-2 text-[13px]">
            <span className="px-2 py-0.5 rounded-md bg-surface border border-line font-medium text-ink-2">Frontend</span>
            <span className="px-2 py-0.5 rounded-md bg-surface border border-line font-medium text-ink-2">O'rta</span>
          </div>
          <span className="text-[13px] font-semibold text-brand">220 XP</span>
        </div>

        <div className="px-5 pt-5 pb-6">
          <p className="text-[19px] font-bold tracking-[-0.02em] leading-snug text-ink">Xodimlar jadvali: qidiruv, saralash va sahifalash</p>

          <div className="mt-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-[13px] text-muted">Qolgan vaqt</p>
              <p className="font-mono text-[34px] leading-none font-medium tracking-tight text-ink mt-1.5 tabular-nums">{clock(left)}</p>
            </div>
            <span className="text-[13px] text-muted pb-1">4 soatdan</span>
          </div>
          <div className="mt-3 h-1.5 rounded-full bg-mist overflow-hidden">
            <div className="h-full bg-brand rounded-full transition-[width] duration-1000 ease-linear" style={{ width: `${(left / (4 * 3600)) * 100}%` }} />
          </div>

          <ul className="mt-6 flex flex-col gap-2.5">
            {REQUIREMENTS.map((r, i) => {
              const ok = i < done;
              return (
                <li key={r} className="flex items-center gap-3 text-[15px]">
                  <span
                    className={`w-5 h-5 rounded-[6px] border flex items-center justify-center transition-colors duration-300 ${
                      ok ? "bg-brand border-brand text-white" : "border-line bg-surface"
                    }`}
                  >
                    {ok && (
                      <svg viewBox="0 0 12 12" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M2.5 6.5l2.2 2.2L9.5 3.8" />
                      </svg>
                    )}
                  </span>
                  <span className={ok ? "text-ink" : "text-muted"}>{r}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Mentor bahosi */}
      <div
        className={`mt-4 lg:mt-0 lg:absolute lg:top-full lg:-mt-7 lg:-left-12 lg:w-[340px] rounded-[18px] bg-surface border border-line text-ink p-4 shadow-[0_24px_60px_-20px_rgba(11,16,32,0.4)] transition-all duration-500 ${
          reviewed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
        }`}
        aria-hidden={!reviewed}
      >
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-full bg-brand text-white flex items-center justify-center text-[13px] font-bold">JM</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Jasur, mentor</p>
            <p className="text-[12px] text-muted">Yechimni tekshirdi</p>
          </div>
          <p className="text-[22px] font-bold tracking-tight">
            86<span className="text-muted text-sm font-medium">/100</span>
          </p>
        </div>
        <p className="mt-3 text-[14px] leading-relaxed text-ink-2">
          Komponentlar toza ajratilgan. Mobil versiyada jadval siqilib qolgan — konteynerga gorizontal skroll qo'shing.
        </p>
        <p className="mt-3 text-[13px] font-semibold text-brand">+172 XP qo'shildi</p>
      </div>
    </div>
  );
}
