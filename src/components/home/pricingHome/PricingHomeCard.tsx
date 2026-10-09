import { Link } from "react-router-dom";
import type { Plan } from "../../../types/type";
import { formatPrice, limitLabel } from "../../../lib/format";
import { getStoredUser, getToken } from "../../../lib/auth";

function Check({ inverted }: { inverted: boolean }) {
  return (
    <svg viewBox="0 0 16 16" className={`w-4 h-4 shrink-0 mt-1 ${inverted ? "text-[#8fa6ff]" : "text-brand"}`} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3.5 8.5l3 3 6-7" />
    </svg>
  );
}

/** Tarif kartasi — ma'lumotlar /plans/active dan. Ommabop tarif qora rangda ajralib turadi. */
export default function PricingHomeCard({ plan }: { plan: Plan }) {
  const dark = !!plan.isPopular;
  const loggedInUser = getToken() && getStoredUser()?.role === "user";
  const target = loggedInUser ? "/dashboard/plans" : "/register";
  const features = [
    plan.taskLimit === -1 ? "Cheksiz task" : `${plan.taskLimit} ta task${plan.duration ? ` (${plan.duration} kunda)` : ""}`,
    plan.mentorReviewsIncluded === -1 ? "Cheksiz mentor tekshiruvi" : `${limitLabel(plan.mentorReviewsIncluded)} ta mentor tekshiruvi`,
    ...(plan.aiReviewEnabled ? ["AI kod tahlili"] : []),
    ...(plan.features || []),
  ];

  return (
    <div className={`w-full rounded-[22px] p-7 sm:p-8 flex flex-col ${dark ? "bg-ink text-white" : "bg-white border border-line text-ink"}`}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xl font-bold tracking-[-0.02em]">{plan.name}</h3>
        {dark && <span className="text-[13px] font-semibold text-[#8fa6ff]">Tavsiya etiladi</span>}
      </div>
      {plan.description && <p className={`mt-2 text-[15px] ${dark ? "text-white/60" : "text-muted"}`}>{plan.description}</p>}
      <p className="mt-8 flex items-baseline gap-2 flex-wrap">
        <span className="text-4xl font-extrabold tracking-[-0.04em]">{plan.price ? formatPrice(plan.price).replace(" so'm", "") : "0"}</span>
        <span className={`text-[15px] ${dark ? "text-white/60" : "text-muted"}`}>{plan.price ? `so'm / ${plan.duration} kun` : "so'm, doimiy"}</span>
      </p>
      <ul className="mt-8 flex flex-col gap-3 flex-1">
        {features.map((f) => (
          <li key={f} className={`flex gap-3 text-[15px] ${dark ? "text-white/85" : "text-ink-2"}`}>
            <Check inverted={dark} />
            {f}
          </li>
        ))}
      </ul>
      <Link
        to={target}
        className={`mt-10 h-12 inline-flex items-center justify-center rounded-full text-[15px] font-semibold transition-colors ${
          dark ? "bg-brand text-white hover:bg-brand-deep" : plan.price ? "bg-ink text-white hover:bg-brand" : "border border-line hover:border-ink"
        }`}
      >
        {plan.price ? "Tarifni tanlash" : "Bepul boshlash"}
      </Link>
    </div>
  );
}
