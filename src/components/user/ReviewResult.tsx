import { HiCheckCircle, HiMinusCircle, HiXCircle } from "react-icons/hi2";
import type { AiFeedback, Submission } from "../../types/type";
import { formatDate } from "../../lib/format";
import { Card, StatusBadge, cx } from "../ui";

const CRITERIA = [
  { key: "requirements", label: "Talablarga moslik", max: 40 },
  { key: "functionality", label: "To'g'ri ishlashi", max: 25 },
  { key: "quality", label: "Kod sifati", max: 20 },
  { key: "structure", label: "Tuzilma", max: 15 },
] as const;

const REQ = {
  met: { Icon: HiCheckCircle, cls: "text-emerald-600", label: "Bajarilgan" },
  partial: { Icon: HiMinusCircle, cls: "text-amber-500", label: "Qisman" },
  missing: { Icon: HiXCircle, cls: "text-rose-600", label: "Bajarilmagan" },
} as const;

/** AI mezonlar bo'yicha ballari va talablar ro'yxati */
function AiBreakdown({ ai }: { ai: AiFeedback }) {
  const c = ai.criteria;
  const hasCriteria = !!c && CRITERIA.some((k) => typeof c[k.key] === "number");
  return (
    <>
      {hasCriteria && (
        <div className="grid gap-2.5">
          {CRITERIA.map(({ key, label, max }) => {
            const v = Math.max(0, Math.min(max, c?.[key] ?? 0));
            return (
              <div key={key}>
                <div className="flex items-baseline justify-between text-[12px]">
                  <span className="text-ink-2">{label}</span>
                  <span className="font-semibold text-ink tabular-nums">
                    {v}<span className="text-muted font-normal">/{max}</span>
                  </span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-line overflow-hidden" role="presentation">
                  <div className="h-full rounded-full bg-brand" style={{ width: `${(v / max) * 100}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
      {!!ai.requirements?.length && (
        <div>
          <p className="text-xs font-semibold text-ink-2 mb-1.5">Talablar</p>
          <ul className="flex flex-col gap-2">
            {ai.requirements.map((r, i) => {
              const s = REQ[r.status] ?? REQ.partial;
              return (
                <li key={i} className="flex gap-2 text-sm">
                  <s.Icon size={18} className={cx("shrink-0 mt-0.5", s.cls)} aria-label={s.label} />
                  <span className="min-w-0">
                    <span className="text-ink">{r.text}</span>
                    {r.note && <span className="block text-[12px] text-muted">{r.note}</span>}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </>
  );
}

/** Mentor / AI bahosi va izohlari */
export default function ReviewResult({ submission }: { submission: Submission }) {
  const ai = submission.aiFeedback;
  const mf = submission.mentorFeedback;
  const finished = submission.status === "approved" || submission.status === "rejected";
  if (!finished && !ai?.summary && !mf?.comment) return null;

  return (
    <Card className="p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-ink">Tekshiruv natijasi</h3>
        <StatusBadge status={submission.status} />
      </div>
      {finished && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-mist border border-line p-3">
            <p className="text-[11px] text-muted">Baho</p>
            <p className="text-2xl font-bold text-ink">{submission.reviewScore}<span className="text-sm text-muted">/100</span></p>
          </div>
          <div className="rounded-xl bg-mist border border-line p-3">
            <p className="text-[11px] text-muted">Olingan XP</p>
            <p className="text-2xl font-bold text-brand">+{submission.earnedXP}</p>
          </div>
        </div>
      )}

      {mf?.comment && (
        <div>
          <p className="text-xs font-semibold text-ink-2 mb-1.5">
            Mentor izohi {typeof submission.mentorId === "object" && submission.mentorId ? `— ${submission.mentorId.fullName}` : ""}
          </p>
          <p className="text-sm text-ink-2 whitespace-pre-line rounded-xl bg-mist border border-line p-3">{mf.comment}</p>
          {mf.reviewedAt && <p className="text-[11px] text-muted mt-1">{formatDate(mf.reviewedAt, true)}</p>}
        </div>
      )}

      {ai?.summary && (
        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold text-ink-2">AI tahlili</p>
          <p className="text-sm text-ink-2">{ai.summary}</p>
          <AiBreakdown ai={ai} />
          {[
            { title: "Kuchli tomonlar", items: ai.strengths, cls: "text-brand" },
            { title: "Kamchiliklar", items: ai.weaknesses, cls: "text-rose-600" },
            { title: "Tavsiyalar", items: ai.suggestions, cls: "text-brand" },
          ]
            .filter((g) => g.items?.length)
            .map((g) => (
              <div key={g.title}>
                <p className={`text-xs font-semibold mb-1 ${g.cls}`}>{g.title}</p>
                <ul className="list-disc pl-5 text-sm text-ink-2 space-y-1">
                  {g.items!.map((it, i) => (
                    <li key={i}>{it}</li>
                  ))}
                </ul>
              </div>
            ))}
          {ai.truncated && (
            <p className="text-[11px] text-muted">Repozitoriy katta bo'lgani uchun AI asosiy fayllarni tekshirdi.</p>
          )}
        </div>
      )}
    </Card>
  );
}
