import { useEffect, useState } from "react";
import { SUPPORT_USERNAME } from "../../lib/constants";
import { mentorTermsApi, type MentorTerms } from "../../api/api";
import { formatPrice } from "../../lib/format";
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
  { title: "Kabinet", text: "Administrator mentor kabinetingizni ochadi, onlayn shartnomani tasdiqlaysiz. Kirish — telefon raqam va Telegram kod orqali." },
];

export default function BecomeMentor() {
  const apply = `https://t.me/${SUPPORT_USERNAME}`;
  const [terms, setTerms] = useState<MentorTerms | null>(null);
  useEffect(() => {
    mentorTermsApi.get().then(setTerms).catch(() => undefined);
  }, []);
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

      {/* Mentor uchun eng muhim savol — to'lov. Avval sahifada umuman aytilmagan edi */}
      <section className="border-t border-line">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-20 grid lg:grid-cols-[0.8fr_1.2fr] gap-12">
          <div>
            <h2 className="text-4xl sm:text-5xl font-extrabold tracking-[-0.04em] leading-[1.05] text-ink">Har bir tekshiruv uchun to'lov</h2>
            <p className="mt-5 text-lg text-ink-2 leading-relaxed">
              Summa task qiyinligiga qarab, tekshiruv paytida belgilanadi va oyiga bir marta kartangizga o'tkaziladi.
            </p>
          </div>
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-3 gap-3">
              {(["oson", "orta", "qiyin"] as const).map((d) => (
                <div key={d} className="rounded-2xl border border-line bg-surface p-5">
                  <p className="text-[14px] text-muted">{d === "oson" ? "Oson task" : d === "orta" ? "O'rta task" : "Qiyin task"}</p>
                  <p className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-ink tabular-nums">
                    {terms?.rates?.[d] != null ? formatPrice(terms.rates[d]).replace(" so'm", "") : "—"}
                  </p>
                  <p className="text-[13px] text-muted">so'm</p>
                </div>
              ))}
            </div>
            {terms?.rates && (
              <ul className="flex flex-col gap-2.5 text-[16px] text-ink-2 leading-relaxed">
                <li>Tekshiruv {terms.slaHours} soat ichida bajarilsa — to'liq summa.</li>
                <li>
                  To'lov har oyning {terms.payoutDay}-sanasida, {formatPrice(terms.minPayout)} dan boshlab.
                </li>
                {terms.bonusPct > 0 && <li>Talabalar bahosi yuqori bo'lsa — +{terms.bonusPct}% sifat bonusi.</li>}
              </ul>
            )}
          </div>
        </div>
      </section>

      <section className="bg-brand-tint">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-20 sm:py-28 grid lg:grid-cols-[0.8fr_1.2fr] gap-12">
          <h2 className="text-4xl sm:text-5xl font-extrabold tracking-[-0.04em] leading-[1.05] text-ink">Qabul qanday o'tadi</h2>
          <ol>
            {STEPS.map((s, i) => (
              <li key={s.title} className="grid grid-cols-[3.5rem_1fr] gap-2 py-7 border-t border-brand/20 last:border-b">
                <span className="text-3xl font-extrabold text-brand">{i + 1}</span>
                <div>
                  <h3 className="text-xl font-bold text-ink">{s.title}</h3>
                  <p className="mt-2 text-ink-2 leading-relaxed">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </main>
  );
}
