import type { Plan } from "../../../types/type";
import { comparisonRows } from "../../../lib/plans";
import { cx } from "../../ui";

/** Tariflarni yonma-yon taqqoslash — qaysi biri nimasi bilan farq qilishini bir qarashda ko'rsatadi */
export default function PlanCompare({ plans, currentId }: { plans: Plan[]; currentId?: string }) {
  if (plans.length < 2) return null;
  const rows = comparisonRows(plans);
  return (
    <div className="overflow-x-auto rounded-[22px] border border-line bg-surface">
      <table className="w-full min-w-[560px] text-[15px]">
        <thead>
          <tr className="border-b border-line">
            <th className="text-left font-medium text-muted px-5 py-4 w-44">Taqqoslash</th>
            {plans.map((p) => (
              <th key={p._id} className={cx("text-left px-5 py-4 font-bold text-ink", p.isPopular && "bg-brand-tint")}>
                {p.name}
                {currentId === p._id && <span className="ml-2 text-[12px] font-medium text-brand">joriy</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-b border-line last:border-0">
              <td className="px-5 py-3.5 text-muted">{r.label}</td>
              {r.values.map((v, i) => (
                <td key={i} className={cx("px-5 py-3.5 tabular-nums", v === "—" ? "text-muted" : "text-ink", plans[i].isPopular && "bg-brand-tint/60")}>
                  {v}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
