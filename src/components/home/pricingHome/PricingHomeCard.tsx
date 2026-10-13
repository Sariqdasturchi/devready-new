import { Link } from "react-router-dom";
import type { Plan } from "../../../types/type";
import { formatPrice } from "../../../lib/format";
import { isTopPlan, planAudience, planLines, pricePerTask } from "../../../lib/plans";
import { getStoredUser, getToken } from "../../../lib/auth";

function Mark({ ok, inverted }: { ok: boolean; inverted: boolean }) {
  return ok ? (
    <svg viewBox="0 0 16 16" className={`w-4 h-4 shrink-0 mt-1 ${inverted ? "text-brand-on" : "text-brand"}`} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3.5 8.5l3 3 6-7" />
    </svg>
  ) : (
    <svg viewBox="0 0 16 16" className={`w-4 h-4 shrink-0 mt-1 ${inverted ? "text-white/30" : "text-line"}`} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 8h8" />
    </svg>
  );
}

/** Tarif kartasi — ma'lumotlar /plans/active dan. Ommabop tarif brend (ko'k) rangda ajralib turadi. */
export default function PricingHomeCard({ plan, all = [plan] }: { plan: Plan; all?: Plan[] }) {
  const dark = !!plan.isPopular;
  const top = isTopPlan(plan, all);
  const loggedInUser = getToken() && getStoredUser()?.role === "user";
  const target = loggedInUser ? "/dashboard/plans" : "/register";
  const perTask = pricePerTask(plan);
  const sub = dark ? "text-white/75" : "text-muted";

  return (
    <div className={`w-full rounded-[22px] p-7 sm:p-8 flex flex-col ${dark ? "bg-brand text-white shadow-[0_30px_70px_-30px_rgba(31,75,255,0.55)]" : "bg-surface border border-line text-ink"}`}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xl font-bold tracking-[-0.02em]">{plan.name}</h3>
        {dark ? (
          <span className="text-[13px] font-semibold text-brand-on">Tavsiya etiladi</span>
        ) : top ? (
          <span className="text-[13px] font-semibold text-brand">Eng to'liq</span>
        ) : null}
      </div>
      <p className={`mt-2 text-[15px] leading-relaxed ${sub}`}>{planAudience(plan, all)}</p>
      <p className="mt-7 flex items-baseline gap-2 flex-wrap">
        <span className="text-4xl font-extrabold tracking-[-0.04em]">{plan.price ? formatPrice(plan.price).replace(" so'm", "") : "0"}</span>
        <span className={`text-[15px] ${sub}`}>{plan.price ? `so'm / ${plan.duration} kun` : "so'm, doimiy"}</span>
      </p>
      <p className={`mt-1 text-[13px] ${sub}`}>{perTask || (plan.price ? "Task soni cheklanmagan" : "Karta talab qilinmaydi")}</p>
      <ul className="mt-7 flex flex-col gap-3 flex-1">
        {planLines(plan).map((f) => (
          <li key={f.text} className={`flex gap-3 text-[15px] ${f.included ? (dark ? "text-white/90" : "text-ink-2") : dark ? "text-white/45" : "text-muted/70"}`}>
            <Mark ok={f.included} inverted={dark} />
            {f.text}
          </li>
        ))}
      </ul>
      <Link
        to={target}
        className={`mt-10 h-12 inline-flex items-center justify-center rounded-full text-[15px] font-semibold transition-colors ${
          dark ? "bg-white text-brand-700 hover:bg-white/90" : plan.price ? "bg-brand text-white hover:bg-brand-deep" : "border border-line hover:border-ink"
        }`}
      >
        {plan.price ? `${plan.name} tarifini tanlash` : "Bepul boshlash"}
      </Link>
    </div>
  );
}
