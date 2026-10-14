import { useState } from "react";
import PlansGrid from "../../components/home/pricingHome/PlansGrid";
import { faqs } from "../../config/config";
import Seo from "../../components/Seo";
import { breadcrumbs } from "../../lib/seo";

export default function Pricing() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <main>
      <Seo
        title="Narxlar va tariflar"
        description="DevReady tariflari: bepul boshlang, Pro va Premium bilan ko'proq task, mentor review va AI kod tahlili oling. Tariflarni solishtiring va o'zingizga mosini tanlang."
        jsonLd={breadcrumbs([
          { name: "Bosh sahifa", path: "/" },
          { name: "Narxlar", path: "/pricing" },
        ])}
      />
      <section className="max-w-6xl mx-auto px-5 sm:px-8 pt-16 sm:pt-24 pb-14">
        <h1 className="text-5xl sm:text-6xl font-extrabold tracking-[-0.045em] leading-[1.02] text-ink max-w-3xl text-balance">Bepul boshlang, o'sganingiz sari oshiring.</h1>
        <p className="mt-6 text-lg sm:text-xl text-ink-2 max-w-2xl leading-relaxed">
          Free tarifda platformani sinab ko'rasiz. Ko'proq task va mentor tekshiruvi kerak bo'lsa — pullik tarifga o'tasiz. Yashirin to'lovlar yo'q, muddat tugagach pul avtomatik yechib olinmaydi.
        </p>
      </section>

      <section className="max-w-6xl mx-auto px-5 sm:px-8 pb-24">
        <PlansGrid compare />
      </section>

      <section className="border-t border-line bg-mist">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-20 sm:py-28 grid lg:grid-cols-[0.8fr_1.2fr] gap-10 lg:gap-20">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-[-0.04em] text-ink">Ko'p beriladigan savollar</h2>
          <div className="flex flex-col">
            {faqs.map((f, i) => {
              const isOpen = open === i;
              return (
                <div key={f.q} className="border-t border-line last:border-b">
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    className="w-full py-6 flex items-center justify-between gap-6 text-left cursor-pointer"
                  >
                    <span className="text-lg font-semibold text-ink">{f.q}</span>
                    <span className={`w-8 h-8 shrink-0 rounded-full border border-line bg-surface flex items-center justify-center text-ink transition-transform ${isOpen ? "rotate-45" : ""}`}>
                      <svg viewBox="0 0 12 12" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M6 1v10M1 6h10" />
                      </svg>
                    </span>
                  </button>
                  {isOpen && <p className="pb-6 -mt-1 text-[17px] leading-relaxed text-ink-2 max-w-2xl">{f.a}</p>}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
