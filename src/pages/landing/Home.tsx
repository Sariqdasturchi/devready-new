import { Link } from "react-router-dom";
import HeroTask from "../../components/home/HeroTask";
import PlansGrid from "../../components/home/pricingHome/PlansGrid";
import { ACTIVE_TRACKS } from "../../lib/constants";
import Seo from "../../components/Seo";
import { SITE_URL } from "../../lib/seo";

const STEPS = [
  {
    title: "Taskni sinab ko'ring",
    text: "Ro'yxatdan o'tmasdan: taskni oching, brauzerda kod yozing va avtomatik testlarni ishga tushiring.",
  },
  {
    title: "Ro'yxatdan o'ting",
    text: "Google, GitHub yoki telefon raqam bilan — bir daqiqa. Yozgan kodingiz o'z joyida qoladi.",
  },
  {
    title: "Mentorga yuboring",
    text: "Yechimni mentor yoki AI tekshiruviga yuborasiz. O'z tempingizda (7 kun) yoki taymer bilan — xuddi suhbatdagidek.",
  },
  {
    title: "Baho va izoh oling",
    text: "Ball, nima yaxshi va nimani tuzatish kerakligi haqida izoh, XP. Qabul qilingan yechimlar ochiq profilingizga — rezyumega qo'yadigan havolaga tushadi.",
  },
];

const VALUES = [
  {
    title: "Kursdan keyingi birinchi qadam",
    text: "Boshlang'ich tasklardan suhbat savollarigacha: fetch va forma validatsiyasidan LRU cache va SQL window funksiyalarigacha. Osonidan boshlaysiz.",
  },
  {
    title: "Haqiqiy kod review",
    text: "Mentor yechimingizni jamoadagi hamkasbdek ko'rib chiqadi: nima yaxshi, nimani tuzatish kerak va nima uchun.",
  },
  {
    title: "Ish beruvchiga ko'rsatadigan isbot",
    text: "Har bir qabul qilingan yechim — baho, test natijasi va izoh bilan ochiq profilingizda. Rezyumeingizga bitta havola qo'yasiz.",
  },
];

// "Todo ro'yxat" taskining haqiqiy testlari — kod muhitida aynan shunday ko'rinadi (soxta statistika o'rniga)
const DEMO_TESTS: { t: string; ok: boolean; err?: string }[] = [
  { t: "Boshlang'ich 2 ta vazifa va hisob", ok: true },
  { t: "Qo'shish: trim va input tozalanadi", ok: true },
  { t: "Bo'sh matn qo'shilmaydi", ok: true },
  { t: "Checkbox → done va hisob", ok: true },
  { t: "O'chirish faqat shu vazifani", ok: true },
  { t: "Bajarilganlarni o'chirish", ok: false, err: "#clear-done bajarilgan vazifa yo'qligida disabled emas" },
  { t: "Matn HTML sifatida talqin qilinmaydi", ok: false, err: "<b>salom</b> qalin bo'lib chiqdi — innerHTML ishlatilgan (XSS)" },
];

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
              Kurs tugadi, endi amaliyot kerak. Ishda va texnik suhbatlarda beriladigan tasklarni brauzerda yozasiz, testlar darhol natija ko'rsatadi,
              yechimni mentor yoki AI tekshiradi.
            </p>
            <div className="mt-9 flex flex-col sm:flex-row gap-3">
              <Link
                to="/register"
                className="h-[52px] px-7 inline-flex items-center justify-center rounded-full bg-brand text-white text-base font-semibold hover:bg-brand-deep transition-colors"
              >
                Bepul boshlash
              </Link>
              <Link
                to="/tasks"
                className="h-[52px] px-7 inline-flex items-center justify-center rounded-full border border-line text-ink text-base font-semibold hover:border-ink transition-colors"
              >
                Ro'yxatdan o'tmasdan sinab ko'rish
              </Link>
            </div>
            <p className="mt-5 text-sm text-muted">Kod brauzerda ishlaydi — hech narsa o'rnatish shart emas. Free tarifda 10 ta task.</p>
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
            {ACTIVE_TRACKS.length} ta yo'nalish bo'yicha tasklar — o'zingiznikini tanlang.
          </p>
          <ul className="flex flex-wrap gap-2">
            {ACTIVE_TRACKS.map((t) => (
              <li key={t}>
                <Link
                  to={`/tasks?track=${encodeURIComponent(t)}`}
                  className="h-10 px-4 inline-flex items-center rounded-full bg-surface border border-line text-[15px] font-medium text-ink hover:border-ink transition-colors"
                >
                  {t}
                </Link>
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

      {/* NEGA AMALIYOT — yumshoq fon */}
      <section className="bg-mist border-y border-line">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-24 sm:py-32">
          <div className="grid lg:grid-cols-2 gap-14 lg:gap-20 items-center">
            <div>
              <h2 className="text-4xl sm:text-5xl font-extrabold tracking-[-0.04em] leading-[1.05] text-balance text-ink">Ish beruvchi diplomni emas, qilgan ishingizni so'raydi.</h2>
              <div className="mt-12 flex flex-col gap-9">
                {VALUES.map((v) => (
                  <div key={v.title} className="max-w-lg">
                    <h3 className="text-xl font-bold tracking-[-0.01em] text-ink">{v.title}</h3>
                    <p className="mt-2 text-ink-2 leading-relaxed">{v.text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Kod muhiti namunasi: haqiqiy taskning testlari */}
            <div className="rounded-[22px] border border-line bg-surface shadow-[0_30px_70px_-40px_rgba(11,16,32,0.35)] overflow-hidden" aria-label="Test natijalari namunasi">
              <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-line bg-mist/60">
                <p className="text-[14px] font-semibold text-ink truncate">Todo ro'yxat — testlar</p>
                <span className="text-[13px] font-semibold text-ink tabular-nums shrink-0">5 / 7 o'tdi</span>
              </div>
              <ul className="px-5 py-4 flex flex-col gap-2.5">
                {DEMO_TESTS.map((r) => (
                  <li key={r.t} className="flex items-start gap-2.5 text-[14px]">
                    <span className={`mt-0.5 w-4 h-4 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold text-white ${r.ok ? "bg-emerald-600" : "bg-rose-600"}`} aria-hidden>
                      {r.ok ? "✓" : "✕"}
                    </span>
                    <span className="min-w-0">
                      <span className={r.ok ? "text-ink" : "text-ink font-medium"}>{r.t}</span>
                      {r.err && <span className="block text-[13px] text-rose-600 font-mono break-words">{r.err}</span>}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="px-5 pb-5">
                <div className="rounded-2xl bg-brand-tint p-4 text-[14px] leading-relaxed text-ink">
                  <p className="text-[12px] font-semibold text-brand-deep mb-1">Tekshiruv izohi (namuna)</p>
                  Foydalanuvchi matnini <code className="font-mono text-[13px]">textContent</code> orqali chiqaring — <code className="font-mono text-[13px]">innerHTML</code> XSS'ga
                  yo'l ochadi. Suhbatda aynan shu so'raladi.
                </div>
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
          <Link to="/mentors" className="h-12 px-6 inline-flex items-center justify-center rounded-full border border-line bg-surface text-ink font-semibold hover:border-brand hover:text-brand transition-colors shrink-0">
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
            className="h-14 px-8 inline-flex items-center justify-center rounded-full bg-white text-brand-700 text-base font-semibold hover:bg-white/90 transition-colors shrink-0"
          >
            Bepul ro'yxatdan o'tish
          </Link>
        </div>
      </section>
    </main>
  );
}
