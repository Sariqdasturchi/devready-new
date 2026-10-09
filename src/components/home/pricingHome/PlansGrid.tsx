import { useEffect, useState } from "react";
import { planApi } from "../../../api/api";
import type { Plan } from "../../../types/type";
import PricingHomeCard from "./PricingHomeCard";

/** Faol tariflar (backenddan) */
export default function PlansGrid() {
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 items-stretch">
      {plans.map((p) => (
        <div key={p._id} className="flex">
          <PricingHomeCard plan={p} />
        </div>
      ))}
    </div>
  );
}
