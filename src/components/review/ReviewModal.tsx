import { lazy, Suspense, useState } from "react";
import { HiOutlineArrowTopRightOnSquare, HiOutlineCodeBracket } from "react-icons/hi2";
import { earningApi, errorCode, errorMessage, submissionApi } from "../../api/api";
import { useCachedQuery } from "../../hooks/useCachedQuery";
import { getStoredUser } from "../../lib/auth";
import { formatPrice, mediaUrl } from "../../lib/format";
import ContractModal from "../payout/ContractModal";
import type { Submission } from "../../types/type";
import { formatDate, formatDuration } from "../../lib/format";
import type { AiHealth, MentorContract } from "../../types/type";
import { Alert, Avatar, Badge, Button, Field, Modal, StatusBadge, Textarea } from "../ui";
import { useToast } from "../ui/toast";
import ReviewResult from "../user/ReviewResult";
import { codeSummary } from "../sandbox/kinds";
import { InlineCode } from "../TaskText";

const QUICK = [40, 60, 75, 85, 95];
const CodeReviewOverlay = lazy(() => import("../sandbox/CodeReviewOverlay"));

/** Mentor uchun: shu tekshiruvga qancha hisoblanishi (stavka va muddatga qarab) */
function payHint(c: MentorContract | undefined, difficulty: string | undefined, since: string | null | undefined) {
  if (!c) return null;
  const rate = c.settings.rates[(difficulty as "oson" | "orta" | "qiyin") || "oson"] ?? c.settings.rates.oson;
  const hours = since ? (Date.now() - new Date(since).getTime()) / 3600000 : 0;
  const late = hours > c.settings.slaHours;
  return { amount: Math.round((rate * (late ? c.settings.lateRatePct : 100)) / 100), late, left: Math.max(0, c.settings.slaHours - hours) };
}

/** Mentor / superadmin uchun yechimni ko'rish va baholash */
export default function ReviewModal({ submission, onClose, onReviewed }: { submission: Submission | null; onClose: () => void; onReviewed: () => void }) {
  if (!submission) return null;
  // key — boshqa yechim ochilganda holat (ball, izoh) yangidan boshlanadi
  return <ReviewModalBody key={submission._id} submission={submission} onClose={onClose} onReviewed={onReviewed} />;
}

function ReviewModalBody({ submission: s, onClose, onReviewed }: { submission: Submission; onClose: () => void; onReviewed: () => void }) {
  const toast = useToast();
  const [score, setScore] = useState(80);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState<"approved" | "rejected" | null>(null);
  const [codeOpen, setCodeOpen] = useState(false);
  const [contractOpen, setContractOpen] = useState(false);
  const isMentor = getStoredUser()?.role === "mentor";
  const contract = useCachedQuery("mentor:contract", earningApi.contract, { staleTime: 60_000, enabled: isMentor });
  const student = typeof s.userId === "object" ? s.userId : null;
  const task = typeof s.taskId === "object" ? s.taskId : null;
  const isSuperadmin = getStoredUser()?.role === "superadmin";
  // AI tekshira olmagan yechimni superadmin qo'lda baholashi mumkin — talaba kutib qolmasin
  const aiFailed = s.reviewMethod === "ai" && s.status === "pending" && !!s.aiFeedback?.error;
  const canReview = s.status === "under_review" || (s.status === "pending" && s.reviewMethod !== "ai") || (isSuperadmin && aiFailed);
  const usedMinutes = s.submittedAt ? Math.round((new Date(s.submittedAt).getTime() - new Date(s.startedAt).getTime()) / 60000) : null;
  const minLen = isMentor ? contract.data?.settings.minCommentLength || 0 : 0;
  const pay = isMentor && canReview ? payHint(contract.data, task?.difficulty, s.assignedAt || s.submittedAt) : null;

  const review = async (status: "approved" | "rejected") => {
    if (status === "rejected" && !comment.trim()) return toast.error("Rad etish sababini izohda yozing");
    if (!Number.isFinite(score) || score < 0 || score > 100) return toast.error("Ball 0-100 oralig'ida bo'lishi kerak");
    if (isMentor && contract.data && !contract.data.accepted) return setContractOpen(true);
    if (minLen && comment.trim().length < minLen) return toast.error(`Izoh kamida ${minLen} belgi bo'lsin — nima yaxshi va nimani tuzatish kerakligini yozing`);
    setSaving(status);
    try {
      const r = await submissionApi.review(s._id, { status, score, comment: comment.trim() });
      const base = status === "approved" ? "Yechim qabul qilindi" : "Yechim rad etildi";
      toast.success(r.earning ? `${base} · +${formatPrice(r.earning.amount)} hisoblandi` : base);
      onReviewed();
    } catch (err) {
      if (errorCode(err) === "CONTRACT_REQUIRED") setContractOpen(true);
      toast.error(errorMessage(err));
    } finally {
      setSaving(null);
    }
  };

  return (
    <>
      {isMentor && <ContractModal open={contractOpen} onClose={() => setContractOpen(false)} onAccepted={contract.refetch} />}
      {codeOpen && s.code && (
        <Suspense fallback={null}>
          <CodeReviewOverlay submission={s} onClose={() => setCodeOpen(false)} />
        </Suspense>
      )}
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
                  <li key={i}>
                    <InlineCode text={r} />
                  </li>
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
            {s.code && (
              <button
                type="button"
                onClick={() => setCodeOpen(true)}
                className="flex items-center gap-3 p-3 rounded-xl border border-brand/30 bg-brand-tint/60 hover:border-brand text-left cursor-pointer"
              >
                <span className="w-10 h-10 rounded-xl bg-surface text-brand inline-flex items-center justify-center shrink-0">
                  <HiOutlineCodeBracket size={20} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-ink">Kod muhitida yozilgan yechim</span>
                  <span className="block text-xs text-muted">
                    {codeSummary(s.code)}
                    {s.testResults?.total ? ` · testlar: ${s.testResults.passed}/${s.testResults.total}` : ""}
                  </span>
                </span>
                <span className="text-sm font-semibold text-brand shrink-0">Kodni ochish</span>
              </button>
            )}
            {!!s.designImages?.length && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {s.designImages.map((im) => (
                  <a key={im.url} href={mediaUrl(im.url) || im.url} target="_blank" rel="noreferrer" className="block rounded-xl overflow-hidden border border-line hover:border-brand/40 bg-mist">
                    <img src={mediaUrl(im.url) || im.url} alt={im.name || "Maket"} loading="lazy" className="w-full h-28 object-cover object-top" />
                  </a>
                ))}
              </div>
            )}
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

          {canReview && aiFailed && <AiStuckPanel submission={s} isSuperadmin={isSuperadmin} onRetried={onReviewed} />}
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
              <Field
                label={minLen ? `Izoh (kamida ${minLen} belgi)` : "Izoh (rad etishda majburiy)"}
                hint={
                  minLen ? (
                    <span className={comment.trim().length >= minLen ? "text-emerald-700" : ""}>
                      {comment.trim().length} / {minLen} — nimasi yaxshi, nimani tuzatish kerak. Talaba shu izohni ko'radi
                    </span>
                  ) : (
                    "Nimasi yaxshi, nimani tuzatish kerak — talaba shu izohni ko'radi"
                  )
                }
              >
                <Textarea rows={5} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Kod tuzilmasi yaxshi, lekin..." />
              </Field>
              {pay && (
                <p className={pay.late ? "text-xs text-amber-700" : "text-xs text-muted"}>
                  Bu tekshiruv uchun sizga: <b>{formatPrice(pay.amount)}</b>
                  {pay.late ? " (muddat o'tgan — kamaytirilgan stavka)" : ` · to'liq stavka uchun ${Math.ceil(pay.left)} soat qoldi`}
                </p>
              )}
              {task?.xp ? <p className="text-xs text-muted">Qabul qilinsa talaba {Math.round((task.xp * score) / 100)} XP oladi.</p> : null}
            </div>
          ) : (
            <>
              {s.reviewMethod === "ai" && (s.status === "pending" || s.status === "ai_checking") && (
                <AiStuckPanel submission={s} isSuperadmin={isSuperadmin} onRetried={onReviewed} />
              )}
              <ReviewResult submission={s} />
            </>
          )}
        </div>
      </Modal>
    </>
  );
}

/** AI tekshiruvi kutilayotgan / xato bilan qolgan yechim: sabab, qayta ishga tushirish va provayderlar holati */
function AiStuckPanel({ submission: s, isSuperadmin, onRetried }: { submission: Submission; isSuperadmin: boolean; onRetried: () => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState<"retry" | "health" | null>(null);
  const [health, setHealth] = useState<AiHealth | null>(null);
  const [openedAt] = useState(() => Date.now());
  const since = s.aiStartedAt || s.updatedAt || s.submittedAt;
  const minutes = since ? Math.round((openedAt - new Date(since).getTime()) / 60000) : null;
  const stuck = s.status === "ai_checking" && minutes !== null && minutes >= 2;

  const retry = async () => {
    setBusy("retry");
    try {
      await submissionApi.retryAi(s._id);
      toast.success("AI tekshiruvi qayta ishga tushirildi");
      onRetried();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const checkHealth = async () => {
    setBusy("health");
    try {
      setHealth(await submissionApi.aiHealth());
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {s.status === "pending" && s.aiFeedback?.error ? (
        <Alert tone="danger">
          AI tekshiruvi bajarilmadi{s.aiAttempts ? ` (${s.aiAttempts}-urinish)` : ""}: {s.aiFeedback.error}
          {isSuperadmin && s.aiFeedback.errorDetail && <span className="block mt-1 text-xs opacity-80 break-words">Texnik sabab: {s.aiFeedback.errorDetail}</span>}
          {isSuperadmin && <span className="block mt-1 text-xs">Kutdirmaslik uchun pastda o'zingiz baholashingiz mumkin.</span>}
        </Alert>
      ) : stuck ? (
        <Alert tone="warning">AI {formatDuration(minutes || 0)} dan beri tekshirmoqda — jarayon uzilgan bo'lishi mumkin. Tizim 12 daqiqadan keyin o'zi qayta uradi.</Alert>
      ) : (
        <Alert tone="neutral">Yechim AI navbatida. Natija bir necha daqiqada chiqadi.</Alert>
      )}
      {isSuperadmin && (
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" loading={busy === "retry"} disabled={!!busy || (s.status === "ai_checking" && !stuck)} onClick={retry}>
            AI bilan qayta tekshirish
          </Button>
          <Button variant="ghost" loading={busy === "health"} disabled={!!busy} onClick={checkHealth}>
            AI holatini tekshirish
          </Button>
        </div>
      )}
      {health && (
        <div className="rounded-xl border border-line divide-y divide-line text-xs">
          {!health.providers.length && <p className="p-3 text-muted">AI_PROVIDERS ro'yxati bo'sh</p>}
          {health.providers.map((p) => (
            <div key={p.provider} className="p-3 flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <span className={p.ok ? "text-emerald-700 font-semibold" : "text-red-700 font-semibold"}>{p.ok ? "Ishlayapti" : "Ishlamayapti"}</span>
                <span className="font-semibold text-ink">{p.provider}</span>
                {p.model && <span className="text-muted">{p.model}</span>}
                {p.ms !== undefined && <span className="text-muted">· {(p.ms / 1000).toFixed(1)} s</span>}
              </div>
              {p.error && (
                <span className="text-ink-2 break-words">
                  {p.status ? `${p.status}: ` : ""}
                  {p.error}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
