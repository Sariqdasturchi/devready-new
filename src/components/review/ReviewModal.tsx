import { useEffect, useState } from "react";
import { HiOutlineArrowTopRightOnSquare } from "react-icons/hi2";
import { errorMessage, submissionApi } from "../../api/api";
import type { Submission } from "../../types/type";
import { formatDate, formatDuration } from "../../lib/format";
import { Alert, Avatar, Badge, Button, Field, Modal, StatusBadge, Textarea } from "../ui";
import { useToast } from "../ui/toast";
import ReviewResult from "../user/ReviewResult";

const QUICK = [40, 60, 75, 85, 95];

/** Mentor / superadmin uchun yechimni ko'rish va baholash */
export default function ReviewModal({ submission, onClose, onReviewed }: { submission: Submission | null; onClose: () => void; onReviewed: () => void }) {
  const toast = useToast();
  const [score, setScore] = useState(80);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState<"approved" | "rejected" | null>(null);

  useEffect(() => {
    if (submission) {
      setScore(80);
      setComment("");
    }
  }, [submission]);

  if (!submission) return null;
  const s = submission;
  const student = typeof s.userId === "object" ? s.userId : null;
  const task = typeof s.taskId === "object" ? s.taskId : null;
  const canReview = s.status === "under_review" || (s.status === "pending" && s.reviewMethod !== "ai");
  const usedMinutes = s.submittedAt ? Math.round((new Date(s.submittedAt).getTime() - new Date(s.startedAt).getTime()) / 60000) : null;

  const review = async (status: "approved" | "rejected") => {
    if (status === "rejected" && !comment.trim()) return toast.error("Rad etish sababini izohda yozing");
    if (!Number.isFinite(score) || score < 0 || score > 100) return toast.error("Ball 0-100 oralig'ida bo'lishi kerak");
    setSaving(status);
    try {
      await submissionApi.review(s._id, { status, score, comment: comment.trim() });
      toast.success(status === "approved" ? "Yechim qabul qilindi" : "Yechim rad etildi");
      onReviewed();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(null);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title="Yechimni tekshirish"
      footer={
        canReview ? (
          <>
            <Button variant="danger" loading={saving === "rejected"} disabled={!!saving} onClick={() => review("rejected")}>
              Rad etish
            </Button>
            <Button loading={saving === "approved"} disabled={!!saving} onClick={() => review("approved")}>
              Qabul qilish
            </Button>
          </>
        ) : (
          <Button variant="secondary" onClick={onClose}>
            Yopish
          </Button>
        )
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <Avatar name={student?.fullName} src={student?.avatar} size={44} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-ink">{student?.fullName || "—"}</p>
            <p className="text-xs text-muted">
              {student?.phone} {student?.degree ? `· ${student.degree}` : ""}
            </p>
          </div>
          <StatusBadge status={s.status} />
        </div>

        <div className="rounded-xl border border-line p-4">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <p className="text-sm font-bold text-ink">{task?.title || "O'chirilgan task"}</p>
            {task?.track && <Badge>{task.track}</Badge>}
            {(s.try || 1) > 1 && <Badge>{s.try}-urinish</Badge>}
          </div>
          <p className="text-xs text-muted">
            Boshlangan: {formatDate(s.startedAt, true)} · Yuborilgan: {formatDate(s.submittedAt, true)}
            {usedMinutes !== null && ` · Sarflangan: ${formatDuration(usedMinutes)}`}
            {task?.estimatedTime ? ` / ${formatDuration(task.estimatedTime)}` : ""}
          </p>
          {!!task?.requirements?.length && (
            <ul className="mt-3 list-disc pl-5 text-xs text-ink-2 space-y-0.5">
              {task.requirements.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          )}
          {!!task?.designTemplates?.length && (
            <div className="mt-3 flex flex-wrap gap-2">
              {task.designTemplates.map((t, i) => (
                <a key={i} href={t.url} target="_blank" rel="noreferrer" className="text-xs text-brand hover:underline inline-flex items-center gap-1">
                  {t.title} <HiOutlineArrowTopRightOnSquare />
                </a>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {s.githubUrl && (
            <a href={s.githubUrl} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-2 p-3 rounded-xl border border-line hover:border-brand/40 text-sm text-brand">
              <span className="truncate">Yechim: {s.githubUrl}</span> <HiOutlineArrowTopRightOnSquare className="shrink-0" />
            </a>
          )}
          {s.liveDemoUrl && (
            <a href={s.liveDemoUrl} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-2 p-3 rounded-xl border border-line hover:border-brand text-sm text-brand">
              <span className="truncate">Demo: {s.liveDemoUrl}</span> <HiOutlineArrowTopRightOnSquare className="shrink-0" />
            </a>
          )}
          {s.notes && <Alert tone="neutral">Talaba izohi: {s.notes}</Alert>}
        </div>

        {canReview ? (
          <div className="flex flex-col gap-4">
            <Field label={`Ball: ${score} / 100`}>
              <input type="range" min={0} max={100} value={score} onChange={(e) => setScore(Number(e.target.value))} className="w-full accent-brand" />
            </Field>
            <div className="flex flex-wrap gap-2 -mt-2">
              {QUICK.map((q) => (
                <button key={q} type="button" onClick={() => setScore(q)} className="px-2.5 py-1 rounded-lg text-xs border border-line text-ink-2 hover:border-brand cursor-pointer">
                  {q}
                </button>
              ))}
            </div>
            <Field label="Izoh (rad etishda majburiy)" hint="Nimasi yaxshi, nimani tuzatish kerak — talaba shu izohni ko'radi">
              <Textarea rows={5} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Kod tuzilmasi yaxshi, lekin..." />
            </Field>
            {task?.xp ? <p className="text-xs text-muted">Qabul qilinsa talaba {Math.round((task.xp * score) / 100)} XP oladi.</p> : null}
          </div>
        ) : (
          <ReviewResult submission={s} />
        )}
      </div>
    </Modal>
  );
}
