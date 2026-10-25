import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { HiOutlineCodeBracket } from "react-icons/hi2";
import { errorMessage, orgApi } from "../../api/api";
import { formatDate, formatDuration } from "../../lib/format";
import { codeSummary } from "../sandbox/kinds";
import type { StaffSubmission, TaskSandbox } from "../../types/type";
import { Alert, Avatar, Badge, Button, ErrorState, Field, Modal, PageLoader, StatusBadge, Textarea } from "../ui";
import { useToast } from "../ui/toast";
import ReviewResult from "../user/ReviewResult";
import { REVIEW_MODE } from "./cells";

const CodeReviewOverlay = lazy(() => import("../sandbox/CodeReviewOverlay"));
const QUICK = [40, 60, 75, 85, 95];

/**
 * O'qituvchi uchun yechim oynasi: kod va testlar, urinishlar tarixi, AI natijasi.
 * O'qituvchi baholaydigan yechimga — ball va izoh; AI baholaganiga — qo'shimcha izoh.
 */
export default function TeacherReviewModal({ submissionId, onClose, onChanged }: { submissionId: string | null; onClose: () => void; onChanged: () => void }) {
  if (!submissionId) return null;
  return <Body key={submissionId} submissionId={submissionId} onClose={onClose} onChanged={onChanged} />;
}

function Body({ submissionId, onClose, onChanged }: { submissionId: string; onClose: () => void; onChanged: () => void }) {
  const toast = useToast();
  const [data, setData] = useState<StaffSubmission | null>(null);
  const [error, setError] = useState("");
  const [score, setScore] = useState(80);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState<"approved" | "rejected" | "comment" | null>(null);
  const [codeOpen, setCodeOpen] = useState(false);

  const load = useCallback(() => {
    orgApi
      .submission(submissionId)
      .then((d) => {
        setData(d);
        setError("");
      })
      .catch((e) => setError(errorMessage(e, "Yechim topilmadi")));
  }, [submissionId]);
  useEffect(load, [load]);

  const s = data?.submission;
  const task = s && typeof s.taskId === "object" ? s.taskId : null;
  const student = s && typeof s.userId === "object" ? s.userId : null;
  const canGrade = !!s && ((s.status === "under_review" && s.reviewMethod === "teacher") || (s.status === "pending" && s.reviewMethod !== "mentor"));
  const canComment = !!s && !!s.submittedAt && !canGrade;
  const usedMinutes = s?.submittedAt ? Math.round((new Date(s.submittedAt).getTime() - new Date(s.startedAt).getTime()) / 60000) : null;

  const grade = async (status: "approved" | "rejected") => {
    if (status === "rejected" && comment.trim().length < 10) return toast.error("Rad etish sababini izohda yozing (kamida 10 belgi)");
    setSaving(status);
    try {
      await orgApi.review(submissionId, { status, score, comment: comment.trim() });
      toast.success(status === "approved" ? "Yechim qabul qilindi" : "Yechim rad etildi");
      onChanged();
      onClose();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(null);
    }
  };

  const sendComment = async () => {
    if (comment.trim().length < 3) return toast.error("Izoh yozing");
    setSaving("comment");
    try {
      await orgApi.comment(submissionId, comment.trim());
      toast.success("Izoh talabaga yuborildi");
      setComment("");
      load();
      onChanged();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(null);
    }
  };

  const footer = !s ? undefined : canGrade ? (
    <>
      <Button variant="danger" loading={saving === "rejected"} disabled={!!saving} onClick={() => grade("rejected")}>
        Rad etish
      </Button>
      <Button loading={saving === "approved"} disabled={!!saving} onClick={() => grade("approved")}>
        Qabul qilish
      </Button>
    </>
  ) : canComment ? (
    <>
      <Button variant="secondary" onClick={onClose}>
        Yopish
      </Button>
      <Button loading={saving === "comment"} disabled={!comment.trim()} onClick={sendComment}>
        Izohni yuborish
      </Button>
    </>
  ) : (
    <Button variant="secondary" onClick={onClose}>
      Yopish
    </Button>
  );

  return (
    <>
      {codeOpen && s?.code && (
        <Suspense fallback={null}>
          <CodeReviewOverlay submission={s} onClose={() => setCodeOpen(false)} preloadedSandbox={(task?.sandbox as TaskSandbox | undefined) || null} />
        </Suspense>
      )}
      <Modal open onClose={onClose} size="lg" title="Talaba yechimi" footer={footer}>
        {error ? (
          <ErrorState message={error} onRetry={load} />
        ) : !s || !data ? (
          <PageLoader />
        ) : (
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <Avatar name={student?.fullName} src={student?.avatar} size={44} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-ink">{student?.fullName || "—"}</p>
                <p className="text-xs text-muted">
                  {data.group.name} · {REVIEW_MODE[data.assignment.reviewMode].label}
                </p>
              </div>
              <StatusBadge status={s.status} reviewMethod={s.reviewMethod} />
            </div>

            <div className="rounded-xl border border-line p-4">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <p className="text-sm font-bold text-ink">{task?.title || "O'chirilgan task"}</p>
                {task?.track && <Badge>{task.track}</Badge>}
                {(s.try || 1) > 1 && <Badge>{s.try}-urinish</Badge>}
              </div>
              <p className="text-xs text-muted">
                Boshlagan: {formatDate(s.startedAt, true)}
                {s.submittedAt ? ` · Yuborgan: ${formatDate(s.submittedAt, true)}` : " · Hali yubormagan"}
                {usedMinutes !== null && ` · Sarfladi: ${formatDuration(usedMinutes)}`}
                {` · Muddat: ${formatDate(data.assignment.dueAt, true)}`}
              </p>
            </div>

            {s.code ? (
              <button
                type="button"
                onClick={() => setCodeOpen(true)}
                className="flex items-center gap-3 p-3 rounded-xl border border-brand/30 bg-brand-tint/60 hover:border-brand text-left cursor-pointer"
              >
                <span className="w-10 h-10 rounded-xl bg-surface text-brand inline-flex items-center justify-center shrink-0">
                  <HiOutlineCodeBracket size={20} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-ink">{s.submittedAt ? "Yuborilgan kod" : "Hozirgi qoralama"}</span>
                  <span className="block text-xs text-muted">
                    {codeSummary(s.code)}
                    {s.testResults?.total ? ` · testlar: ${s.testResults.passed}/${s.testResults.total}` : ""}
                  </span>
                </span>
                <span className="text-sm font-semibold text-brand shrink-0">Kodni ochish</span>
              </button>
            ) : (
              !s.githubUrl && <Alert tone="neutral">Talaba hali kod yozmagan.</Alert>
            )}
            {s.githubUrl && (
              <a href={s.githubUrl} target="_blank" rel="noreferrer" className="p-3 rounded-xl border border-line text-sm text-brand truncate hover:border-brand/40">
                Yechim: {s.githubUrl}
              </a>
            )}
            {s.notes && <Alert tone="neutral">Talaba izohi: {s.notes}</Alert>}

            {data.history.length > 1 && (
              <div>
                <p className="text-xs font-semibold text-ink-2 mb-2">Urinishlar</p>
                <ul className="flex flex-col gap-1.5">
                  {data.history.map((h) => (
                    <li key={h.id} className="flex flex-wrap items-center gap-2 text-xs text-ink-2">
                      <span className="font-semibold text-ink">{h.try}-urinish</span>
                      <StatusBadge status={h.status} />
                      {(h.status === "approved" || h.status === "rejected") && <span>{h.score}/100</span>}
                      {h.testResults?.total ? <span className="text-muted">testlar {h.testResults.passed}/{h.testResults.total}</span> : null}
                      <span className="text-muted">{formatDate(h.submittedAt || h.startedAt, true)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {(s.status === "approved" || s.status === "rejected" || s.aiFeedback?.summary) && <ReviewResult submission={s} />}
            {s.aiFeedback?.error && s.reviewMethod === "teacher" && (
              <Alert tone="warning">AI bu yechimni tekshira olmadi, shuning uchun u sizga keldi. Kodni ochib, testlarni o'zingiz ishga tushirishingiz mumkin.</Alert>
            )}

            {canGrade && (
              <div className="flex flex-col gap-4">
                <Field label={`Ball: ${score} / 100`}>
                  <input type="range" min={0} max={100} value={score} onChange={(e) => setScore(Number(e.target.value))} className="w-full accent-brand" aria-label="Ball" />
                </Field>
                <div className="flex flex-wrap gap-2 -mt-2">
                  {QUICK.map((q) => (
                    <button key={q} type="button" onClick={() => setScore(q)} className="px-2.5 py-1 rounded-lg text-xs border border-line text-ink-2 hover:border-brand cursor-pointer">
                      {q}
                    </button>
                  ))}
                </div>
                <Field label="Izoh (rad etishda majburiy)" hint="Nimasi yaxshi, nimani tuzatish kerak — talaba shu izohni ko'radi">
                  <Textarea rows={4} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Yechim to'g'ri ishlaydi, lekin..." />
                </Field>
                {task?.xp ? <p className="text-xs text-muted">Qabul qilinsa talaba {Math.round((task.xp * score) / 100)} XP oladi (agar bu taskni avval bajarmagan bo'lsa).</p> : null}
              </div>
            )}

            {canComment && (
              <Field label={s.teacherComment?.text ? "Izohni yangilash" : "Talabaga izoh"} hint="Talaba bildirishnoma oladi va izohni task sahifasida ko'radi">
                <Textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Masalan: LIMIT/OFFSET o'rniga keyset pagination'ni ham sinab ko'ring" />
              </Field>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
