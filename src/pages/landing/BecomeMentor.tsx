import { SUPPORT_USERNAME } from "../../lib/constants";
import Seo from "../../components/Seo";
import { breadcrumbs } from "../../lib/seo";

const ROLE = [
  { title: "Yechimlarni tekshirasiz", text: "Talabalar o'z yo'nalishingizdagi tasklarni sizga yuboradi. Ball qo'yasiz va nima yaxshi, nimani tuzatish kerakligini yozasiz." },
  { title: "O'z vaqtingizda ishlaysiz", text: "Band bo'lsangiz, kabinetda \"band\" holatini yoqasiz — yangi tekshiruvlar sizga kelmaydi." },
  { title: "Kuchli talabalarni ko'rasiz", text: "Kim muddatda, sifatli ishlashini birinchi bo'lib bilasiz. Jamoangiz uchun kadr topishning qisqa yo'li." },
];

const STEPS = [
  { title: "Ariza yuboring", text: "Telegram orqali tajribangiz, yo'nalishingiz va GitHub yoki portfoliongizni yuboring." },
  { title: "Suhbat", text: "Qisqa texnik suhbat va bitta namunaviy yechimni birga tekshirib chiqamiz." },
  { title: "Kabinet", text: "Administrator mentor kabinetingizni ochadi. Kirish — telefon raqam va Telegram kod orqali." },
];

export default function BecomeMentor() {
  const apply = `https://t.me/${SUPPORT_USERNAME}`;
  return (
    <main>
      <Seo
        title="Mentor bo'lish"
        description="Tajribali dasturchimisiz? DevReady'da mentor bo'ling: junior dasturchilarning kodini tekshiring, izoh bering va har bir review uchun daromad oling."
        jsonLd={breadcrumbs([
          { name: "Bosh sahifa", path: "/" },
          { name: "Mentor bo'lish", path: "/mentors" },
        ])}
      />
      <section className="max-w-6xl mx-auto px-5 sm:px-8 pt-16 sm:pt-24 pb-20">
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-[-0.045em] leading-[1.02] text-ink max-w-4xl text-balance">
          Tajribangizni keyingi avlod dasturchilariga ulashing.
        </h1>
        <p className="mt-6 text-lg sm:text-xl text-ink-2 max-w-2xl leading-relaxed">
          DevReady mentorlari talabalarning real tasklarini tekshiradi va ularni birinchi ish o'rniga tayyorlaydi.
        </p>
        <a
          href={apply}
          target="_blank"
          rel="noreferrer"
          className="mt-9 h-[52px] px-7 inline-flex items-center justify-center rounded-full bg-brand text-white font-semibold hover:bg-brand-deep transition-colors"
        >
          Telegram orqali ariza yuborish
        </a>
      </section>

      <section className="border-t border-line">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-20 grid md:grid-cols-3 gap-10">
          {ROLE.map((r) => (
            <div key={r.title}>
              <h2 className="text-xl font-bold tracking-[-0.02em] text-ink">{r.title}</h2>
              <p className="mt-3 text-[17px] text-ink-2 leading-relaxed">{r.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-ink text-white">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-20 sm:py-28 grid lg:grid-cols-[0.8fr_1.2fr] gap-12">
          <h2 className="text-4xl sm:text-5xl font-extrabold tracking-[-0.04em] leading-[1.05]">Qabul qanday o'tadi</h2>
          <ol>
            {STEPS.map((s, i) => (
              <li key={s.title} className="grid grid-cols-[3.5rem_1fr] gap-2 py-7 border-t border-white/15 last:border-b">
                <span className="text-3xl font-extrabold text-[#8fa6ff]">{i + 1}</span>
                <div>
                  <h3 className="text-xl font-bold">{s.title}</h3>
                  <p className="mt-2 text-white/65 leading-relaxed">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </main>
  );
}
