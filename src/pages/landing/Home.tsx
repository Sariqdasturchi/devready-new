import { Link } from "react-router-dom";
import HeroTask from "../../components/home/HeroTask";
import PlansGrid from "../../components/home/pricingHome/PlansGrid";
import { TRACKS } from "../../lib/constants";
import Seo from "../../components/Seo";
import { SITE_URL } from "../../lib/seo";

const STEPS = [
  {
    title: "Ro'yxatdan o'ting",
    text: "Telefon raqam va Telegram bot orqali bir daqiqada. Qisqa test boshlang'ich darajangizni aniqlaydi.",
  },
  {
    title: "Taskni boshlang",
    text: "Har bir taskda shartlar, talablar va kerak bo'lsa Figma maket bor. Boshlash bosilgach taymer ishga tushadi.",
  },
  {
    title: "Mentorga yuboring",
    text: "GitHub yoki Figma havolasini yuborasiz va yo'nalishingizdagi mentorlardan birini o'zingiz tanlaysiz.",
  },
  {
    title: "Baho va izoh oling",
    text: "Ball, batafsil izoh va XP. Vaqtida yuborilmagan task bajarilmagan hisoblanadi — xuddi ishdagidek.",
  },
];

const VALUES = [
  {
    title: "Muddat bilan ishlash",
    text: "Har bir taskning qiyinligiga qarab vaqti bor. Vaqtni rejalashtirish ko'nikmasi kod yozish bilan birga shakllanadi.",
  },
  {
    title: "Haqiqiy kod review",
    text: "Mentor yechimingizni jamoadagi hamkasbdek ko'rib chiqadi: nima yaxshi, nimani tuzatish kerak va nima uchun.",
  },
  {
    title: "Ko'rinadigan o'sish",
    text: "Kunlik, haftalik va oylik statistika, XP va liderboard. Suhbatda ko'rsatish uchun bajarilgan ishlar to'planadi.",
  },
];

// Faollik kalendari namunasi (bezak uchun, deterministik)
const HEAT = Array.from({ length: 7 * 18 }, (_, i) => {
  const v = (i * 37 + (i % 7) * 11) % 10;
  return v > 7 ? 3 : v > 5 ? 2 : v > 2 ? 1 : 0;
});
const HEAT_CLS = ["bg-white/[0.07]", "bg-brand/40", "bg-brand/70", "bg-brand"];

export default function Home() {
  return (
    <main>
      <Seo
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "DevReady — amaliy tasklar va mentor tekshiruvi bilan dasturchi bo'ling",
          url: SITE_URL,
          description: "Amaliy tasklar, vaqt va mentor tekshiruvi orqali dasturchilarni real loyihalar va texnik suhbatga tayyorlaydigan platforma.",
          inLanguage: "uz",
          isPartOf: { "@id": `${SITE_URL}/#website` },
          about: { "@id": `${SITE_URL}/#organization` },
        }}
      />
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 pt-14 sm:pt-20 pb-24 lg:pb-44 grid lg:grid-cols-[1.05fr_0.95fr] gap-14 lg:gap-10 items-center">
          <div className="rise">
            <h1 className="text-[44px] leading-[1.02] sm:text-6xl lg:text-[76px] font-extrabold tracking-[-0.045em] text-ink text-balance">
              Dars ko'rish yetarli. Endi task bajaring.
            </h1>
            <p className="mt-6 text-lg sm:text-xl leading-relaxed text-ink-2 max-w-[34rem]">
              DevReady — real loyihalarga o'xshash vazifalar platformasi. Har bir taskga vaqt beriladi, yechimingizni tajribali mentor tekshiradi va siz
              texnik suhbatga tayyor holda chiqasiz.
            </p>
            <div className="mt-9 flex flex-col sm:flex-row gap-3">
              <Link
                to="/register"
                className="h-[52px] px-7 inline-flex items-center justify-center rounded-full bg-brand text-white text-base font-semibold hover:bg-brand-deep transition-colors"
              >
                Bepul boshlash
              </Link>
              <a
                href="#how"
                className="h-[52px] px-7 inline-flex items-center justify-center rounded-full border border-line text-ink text-base font-semibold hover:border-ink transition-colors"
              >
                Qanday ishlaydi
              </a>
            </div>
            <p className="mt-5 text-sm text-muted">Free tarifda 10 ta task. Karta talab qilinmaydi.</p>
          </div>
          <div className="lg:pl-10">
            <HeroTask />
          </div>
        </div>
      </section>

      {/* YO'NALISHLAR */}
      <section className="border-y border-line bg-mist">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-10 flex flex-col lg:flex-row lg:items-center gap-6">
          <p className="text-[15px] text-ink-2 lg:w-64 shrink-0">
            {TRACKS.length} ta yo'nalish bo'yicha tasklar — o'zingiznikini tanlang.
          </p>
          <ul className="flex flex-wrap gap-2">
            {TRACKS.map((t) => (
              <li key={t} className="h-10 px-4 inline-flex items-center rounded-full bg-white border border-line text-[15px] font-medium text-ink">
                {t}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* QANDAY ISHLAYDI */}
      <section id="how" className="scroll-mt-20">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-24 sm:py-32 grid lg:grid-cols-[0.8fr_1.2fr] gap-12 lg:gap-20">
          <div className="lg:sticky lg:top-28 self-start">
            <h2 className="text-4xl sm:text-5xl font-extrabold tracking-[-0.04em] leading-[1.05] text-ink">Qanday ishlaydi</h2>
            <p className="mt-5 text-lg text-ink-2 leading-relaxed max-w-md">
              To'rt qadam. Birinchi taskni boshlash uchun bir necha daqiqa yetadi.
            </p>
          </div>
          <ol className="flex flex-col">
            {STEPS.map((s, i) => (
              <li key={s.title} className="grid grid-cols-[3.5rem_1fr] sm:grid-cols-[5rem_1fr] gap-2 py-8 border-t border-line last:border-b">
                <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-brand tabular-nums">{i + 1}</span>
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold tracking-[-0.02em] text-ink">{s.title}</h3>
                  <p className="mt-2 text-base sm:text-[17px] leading-relaxed text-ink-2 max-w-xl">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* NEGA AMALIYOT — qora blok */}
      <section className="bg-ink text-white">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-24 sm:py-32">
          <div className="grid lg:grid-cols-2 gap-14 lg:gap-20 items-center">
            <div>
              <h2 className="text-4xl sm:text-5xl font-extrabold tracking-[-0.04em] leading-[1.05] text-balance">Ish beruvchi diplomni emas, qilgan ishingizni so'raydi.</h2>
              <div className="mt-12 flex flex-col gap-9">
                {VALUES.map((v) => (
                  <div key={v.title} className="max-w-lg">
                    <h3 className="text-xl font-bold tracking-[-0.01em]">{v.title}</h3>
                    <p className="mt-2 text-white/65 leading-relaxed">{v.text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Kabinet namunasi */}
            <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-5 sm:p-7" aria-label="Kabinet namunasi">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { k: "Jami XP", v: "2 340" },
                  { k: "Reyting", v: "#4" },
                  { k: "Streak", v: "12 kun" },
                ].map((s) => (
                  <div key={s.k} className="rounded-2xl bg-white/[0.06] p-3.5 sm:p-4">
                    <p className="text-[12px] sm:text-[13px] text-white/50">{s.k}</p>
                    <p className="mt-1 text-xl sm:text-2xl font-bold tracking-tight">{s.v}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6">
                <p className="text-[13px] text-white/50 mb-3">So'nggi 18 hafta faolligi</p>
                <div className="grid grid-flow-col grid-rows-7 gap-[4px] w-fit">
                  {HEAT.map((h, i) => (
                    <span key={i} className={`w-[11px] h-[11px] sm:w-[14px] sm:h-[14px] rounded-[3px] ${HEAT_CLS[h]}`} />
                  ))}
                </div>
              </div>
              <div className="mt-6 flex flex-col divide-y divide-white/10">
                {[
                  { t: "REST API: kutubxona", s: "Qabul qilindi", x: "+212 XP", ok: true },
                  { t: "Kanban board drag & drop", s: "Mentor tekshirmoqda", x: "", ok: false },
                ].map((r) => (
                  <div key={r.t} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="text-[15px] font-medium truncate">{r.t}</p>
                      <p className={`text-[13px] ${r.ok ? "text-[#8fa6ff]" : "text-white/50"}`}>{r.s}</p>
                    </div>
                    {r.x && <span className="text-[14px] font-semibold shrink-0">{r.x}</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* NARXLAR */}
      <section id="pricing" className="scroll-mt-20">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-24 sm:py-32">
          <div className="max-w-2xl mb-14">
            <h2 className="text-4xl sm:text-5xl font-extrabold tracking-[-0.04em] leading-[1.05] text-ink">Narxlar</h2>
            <p className="mt-5 text-lg text-ink-2 leading-relaxed">
              Bepul boshlang. Ko'proq task va mentor tekshiruvi kerak bo'lganda tarifni oshirasiz — to'lov karta orqali, chekni yuklash bilan.
            </p>
          </div>
          <PlansGrid />
        </div>
      </section>

      {/* MENTORLAR */}
      <section className="border-t border-line">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-14 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-[-0.03em] text-ink">Tajribali dasturchimisiz?</h2>
            <p className="mt-2 text-ink-2 max-w-xl">Mentor bo'ling: yechimlarni tekshiring, yosh dasturchilarga yo'l ko'rsating va jamoangiz uchun kadrlar toping.</p>
          </div>
          <Link to="/mentors" className="h-12 px-6 inline-flex items-center justify-center rounded-full border border-ink text-ink font-semibold hover:bg-ink hover:text-white transition-colors shrink-0">
            Mentor bo'lish
          </Link>
        </div>
      </section>

      {/* YAKUNIY CTA */}
      <section className="bg-brand text-white">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-20 sm:py-24 flex flex-col lg:flex-row lg:items-end justify-between gap-10">
          <h2 className="text-4xl sm:text-6xl font-extrabold tracking-[-0.045em] leading-[1.02] max-w-3xl text-balance">Birinchi taskni bugun boshlang.</h2>
          <Link
            to="/register"
            className="h-14 px-8 inline-flex items-center justify-center rounded-full bg-white text-ink text-base font-semibold hover:bg-ink hover:text-white transition-colors shrink-0"
          >
            Bepul ro'yxatdan o'tish
          </Link>
        </div>
      </section>
    </main>
  );
}
