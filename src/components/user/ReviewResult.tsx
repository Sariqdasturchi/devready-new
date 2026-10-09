import type { Submission } from "../../types/type";
import { formatDate } from "../../lib/format";
import { Card, StatusBadge } from "../ui";

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
        </div>
      )}
    </Card>
  );
}
