import { useEffect, useState } from "react";
import { planApi } from "../../../api/api";
import type { Plan } from "../../../types/type";
import PricingHomeCard from "./PricingHomeCard";
import PlanCompare from "./PlanCompare";

/** Faol tariflar (backenddan) */
export default function PlansGrid({ compare = false }: { compare?: boolean }) {
  const [plans, setPlans] = useState<Plan[] | null>(null);

  useEffect(() => {
    planApi
      .active()
      .then(setPlans)
      .catch(() => setPlans([]));
  }, []);

  if (plans === null) {
    return (
      <div className="page-loader !min-h-[240px]">
        <span />
      </div>
    );
  }
  if (!plans.length) return <p className="text-muted">Tariflar tez orada e'lon qilinadi</p>;

  return (
    <div className="flex flex-col gap-10">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 items-stretch">
        {plans.map((p) => (
          <div key={p._id} className="flex">
            <PricingHomeCard plan={p} all={plans} />
          </div>
        ))}
      </div>
      {compare && plans.length > 1 && (
        <div>
          <h2 className="text-2xl font-bold tracking-[-0.03em] text-ink mb-5">Tariflarni taqqoslang</h2>
          <PlanCompare plans={plans} />
        </div>
      )}
    </div>
  );
}
