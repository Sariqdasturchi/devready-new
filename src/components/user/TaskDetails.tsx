import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  HiOutlineArrowLeft,
  HiOutlineArrowTopRightOnSquare,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineCodeBracket,
  HiOutlineCpuChip,
  HiOutlineDocumentText,
  HiOutlinePaintBrush,
  HiOutlinePlay,
  HiOutlineSparkles,
  HiOutlineUserGroup,
} from "react-icons/hi2";
import { errorCode, errorMessage, mentorApi, submissionApi, taskApi } from "../../api/api";
import type { DesignImage, Mentor, Submission, UserTask } from "../../types/type";
import { DIFFICULTY, IN_REVIEW } from "../../lib/constants";
import { formatCountdown, formatDate, formatDuration } from "../../lib/format";
import { invalidateCache } from "../../hooks/useCachedQuery";
import { Alert, Badge, Button, Card, ConfirmModal, ErrorState, Field, Input, PageLoader, StatusBadge, Textarea, cx } from "../ui";
import { useToast } from "../ui/toast";
import { MentorSelector } from "./MentorSelector";
import { useCountdown } from "./Countdown";
import ReviewResult from "./ReviewResult";
import { MentorFeedback, ReassignPanel } from "./MentorFeedback";
import UpgradeModal from "./UpgradeModal";
import { stackLabel, testCount } from "../sandbox/kinds";
import { hasTryDraft } from "../sandbox/workspaceState";
import DesignUpload from "./DesignUpload";

const isGitHub = (url: string) => /^https:\/\/github\.com\/[^/]+\/[^/]+/.test(url.trim());

export default function TaskDetails() {
  const { id = "" } = useParams();
  const toast = useToast();
  const navigate = useNavigate();
  const [task, setTask] = useState<UserTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [offset, setOffset] = useState(0);
  const [confirmStart, setConfirmStart] = useState(false);
  // false — erkin rejim (7 kun), true — taymer bilan (task vaqti)
  const [timed, setTimed] = useState(false);
  const [starting, setStarting] = useState(false);
  const [upgrade, setUpgrade] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const t = await taskApi.get(id);
      setTask(t);
      if (t.serverTime) setOffset(new Date(t.serverTime).getTime() - Date.now());
      setError("");
    } catch (err) {
      setError(errorMessage(err, "Vazifa topilmadi"));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  // AI tekshiruvi davomida natijani avtomatik yangilab turamiz
  useEffect(() => {
    if (!task || !["pending", "ai_checking"].includes(task.status) || task.submission?.reviewMethod !== "ai") return;
    if (task.status === "pending" && task.submission?.aiFeedback?.error) return; // xato — foydalanuvchi qaror qiladi
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [task, load]);

  const refreshLists = () => invalidateCache("user:tasks", "user:overview", "user:submissions");

  const start = async () => {
    setStarting(true);
    try {
      await submissionApi.start(id, timed);
      toast.success(timed ? "Task boshlandi. Vaqt ketdi — omad!" : "Task boshlandi. Omad!");
      refreshLists();
      setConfirmStart(false);
      // Kod muhiti bor taskda to'g'ridan-to'g'ri muharrirga o'tamiz
      if (task?.sandbox?.enabled) return navigate(`/dashboard/tasks/${id}/code`);
      await load();
    } catch (err) {
      setConfirmStart(false);
      if (errorCode(err) === "PLAN_LIMIT") setUpgrade(errorMessage(err));
      else toast.error(errorMessage(err));
    } finally {
      setStarting(false);
    }
  };

  if (loading) return <PageLoader label="Vazifa yuklanmoqda..." />;
  if (error || !task) return <ErrorState message={error || "Vazifa topilmadi"} onRetry={load} />;

  const diff = DIFFICULTY[task.difficulty] || DIFFICULTY.oson;
  const canStart = ["not_started", "rejected", "expired"].includes(task.status);
  const submission = task.submission;

  return (
    <div className="max-w-6xl mx-auto">
      <Link to="/dashboard/tasks" className="inline-flex items-center gap-2 text-xs font-semibold text-muted hover:text-ink mb-5">
        <HiOutlineArrowLeft /> Vazifalarga qaytish
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Chap: task ma'lumotlari */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-5">
          <Card className="p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Badge>{task.track}</Badge>
              <span className={`px-2 py-0.5 rounded-md border text-[11px] font-semibold ${diff.className}`}>{diff.label}</span>
              <StatusBadge status={task.status} />
              {task.tries > 1 && <Badge tone="neutral">{task.tries}-urinish</Badge>}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-ink leading-tight">{task.title}</h1>
            <div className="flex flex-wrap gap-2 mt-4 text-xs">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-brand-tint text-brand font-semibold">
                <HiOutlineSparkles /> {task.xp} XP
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-mist text-ink-2">
                <HiOutlineClock /> Ajratilgan vaqt: {formatDuration(task.estimatedTime)}
              </span>
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <h2 className="text-sm font-bold text-ink mb-3 flex items-center gap-2">
              <HiOutlineDocumentText className="text-muted" /> Vazifa shartlari
            </h2>
            <p className="text-sm text-ink-2 leading-relaxed whitespace-pre-line">{task.description}</p>
            {task.content && <div className="mt-4 pt-4 border-t border-line text-sm text-ink-2 leading-relaxed whitespace-pre-line">{task.content}</div>}
          </Card>

          {!!task.requirements?.length && (
            <Card className="p-5 sm:p-6">
              <h2 className="text-sm font-bold text-ink mb-3">Talablar</h2>
              <ul className="flex flex-col gap-2">
                {task.requirements.map((r, i) => (
                  <li key={i} className="flex gap-2.5 text-sm text-ink-2">
                    <HiOutlineCheckCircle className="text-brand shrink-0 mt-0.5" size={18} />
                    {r}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {(!!task.designTemplates?.length || task.exampleLink) && (
            <Card className="p-5 sm:p-6">
              <h2 className="text-sm font-bold text-ink mb-3 flex items-center gap-2">
                <HiOutlinePaintBrush className="text-brand" /> Shablonlar va dizayn
              </h2>
              <div className="flex flex-col gap-2">
                {task.designTemplates?.map((t, i) => (
                  <a
                    key={t._id || i}
                    href={t.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between gap-3 p-3 rounded-xl border border-line hover:border-brand hover:bg-brand-tint"
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-ink">{t.title || "Shablon"}</span>
                      <span className="block text-[11px] text-muted truncate">{t.url}</span>
                    </span>
                    <HiOutlineArrowTopRightOnSquare className="text-muted shrink-0" />
                  </a>
                ))}
                {task.exampleLink && (
                  <a
                    href={task.exampleLink}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between gap-3 p-3 rounded-xl border border-line hover:border-brand/40 hover:bg-brand-tint"
                  >
                    <span className="text-sm font-semibold text-ink">Namuna (example)</span>
                    <HiOutlineArrowTopRightOnSquare className="text-muted" />
                  </a>
                )}
              </div>
            </Card>
          )}
        </div>

        {/* O'ng: holat va harakatlar */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-5 lg:sticky lg:top-20">
          {canStart && (
            <Card className="p-5 flex flex-col gap-4">
              {task.status === "expired" && <Alert tone="danger">Oldingi urinishda ajratilgan vaqt tugagan. Taskni qaytadan boshlashingiz mumkin.</Alert>}
              {task.status === "rejected" && <Alert tone="warning">Oldingi yechim rad etilgan. Izohlarni o'qib, qayta urinib ko'ring.</Alert>}
              <div>
                <h3 className="text-sm font-bold text-ink">Tayyormisiz?</h3>
                <p className="text-xs text-muted mt-1">
                  Boshlashda rejimni tanlaysiz: erkin (7 kun) yoki taymer bilan ({formatDuration(task.estimatedTime)}) — xuddi texnik suhbatdagidek.
                </p>
                {task.sandbox?.enabled && hasTryDraft(task._id) && (
                  <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800">Sinab ko'rganingizdagi kod saqlangan — boshlaganingizda muharrirda ochiladi.</p>
                )}
                {task.sandbox?.enabled && (
                  <p className="mt-3 flex items-start gap-2 rounded-xl bg-brand-tint p-3 text-xs text-ink-2">
                    <HiOutlineCodeBracket size={16} className="text-brand shrink-0 mt-px" />
                    Bu task brauzerda bajariladi ({stackLabel(task.sandbox)}): muharrir va {testCount(task.sandbox)} ta avtomatik test tayyor — hech narsa o'rnatish shart emas.
                  </p>
                )}
              </div>
              <Button size="lg" onClick={() => setConfirmStart(true)}>
                <HiOutlinePlay size={18} /> {task.status === "not_started" ? "Taskni boshlash" : "Qayta boshlash"}
              </Button>
            </Card>
          )}

          {task.status === "in_progress" && task.sandbox?.enabled && (
            <Card className="p-5 flex flex-col gap-3 border-brand/30">
              <div className="flex items-start gap-3">
                <span className="w-10 h-10 rounded-xl bg-brand-tint text-brand inline-flex items-center justify-center shrink-0">
                  <HiOutlineCodeBracket size={20} />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-ink">Brauzerda kod yozing</h3>
                  <p className="text-xs text-muted mt-1">
                    Hech narsa o'rnatmasdan: {stackLabel(task.sandbox)}, muharrir va {testCount(task.sandbox)} ta avtomatik test bir joyda.
                  </p>
                </div>
              </div>
              <Link
                to={`/dashboard/tasks/${task._id}/code`}
                className="h-11 rounded-full bg-brand text-white font-semibold text-sm inline-flex items-center justify-center gap-2 hover:bg-brand-700 transition-colors"
              >
                <HiOutlineCodeBracket size={18} /> Kod muhitini ochish
              </Link>
            </Card>
          )}

          {task.status === "in_progress" && submission && (
            <SubmitPanel task={task} submissionId={submission._id} offset={offset} onDone={() => { refreshLists(); load(); }} />
          )}

          {task.status !== "in_progress" && submission?.code && task.sandbox?.enabled && (
            <Link
              to={`/dashboard/tasks/${task._id}/code`}
              className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 hover:border-brand/40 transition-colors"
            >
              <span className="w-10 h-10 rounded-xl bg-brand-tint text-brand inline-flex items-center justify-center shrink-0">
                <HiOutlineCodeBracket size={20} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-ink">Yuborilgan kodni ko'rish</span>
                <span className="block text-xs text-muted">
                  {submission.testResults?.total ? `Testlar: ${submission.testResults.passed}/${submission.testResults.total}` : "Kod muhitida yozilgan"}
                </span>
              </span>
            </Link>
          )}

          {IN_REVIEW.includes(task.status) && submission && (
            submission.reviewMethod === "ai" && submission.aiFeedback?.error && submission.status === "pending" ? (
              <AiFailedPanel task={task} submission={submission} onDone={() => { refreshLists(); load(); }} />
            ) : (
              <Card className="p-5 flex flex-col gap-3">
                <div className="flex items-center gap-2 text-sm font-bold text-ink">
                  {submission.reviewMethod === "ai" ? <HiOutlineCpuChip className="text-brand" size={20} /> : <HiOutlineUserGroup className="text-brand" size={20} />}
                  {submission.reviewMethod === "ai" ? "AI tekshirmoqda" : "Mentor tekshirmoqda"}
                </div>
                <p className="text-xs text-muted">
                  {submission.reviewMethod === "ai"
                    ? "Yechimingiz tahlil qilinmoqda. Bu bir necha daqiqa olishi mumkin — sahifa avtomatik yangilanadi."
                    : `Yechim ${typeof submission.mentorId === "object" && submission.mentorId ? submission.mentorId.fullName : "mentor"}ga yuborildi. Natija chiqqanda bildirishnoma keladi.`}
                </p>
                <SubmissionLinks githubUrl={submission.githubUrl} liveDemoUrl={submission.liveDemoUrl} submittedAt={submission.submittedAt} />
                {submission.reviewMethod !== "ai" && submission.status === "under_review" && submission.mentorId && (
                  <ReassignPanel submission={submission} track={task.track} onDone={() => { refreshLists(); load(); }} />
                )}
              </Card>
            )
          )}

          {submission && (submission.status === "approved" || submission.status === "rejected") && (
            <>
              <ReviewResult submission={submission} />
              {submission.reviewMethod !== "ai" && <MentorFeedback submission={submission} />}
              <Card className="p-5">
                <SubmissionLinks githubUrl={submission.githubUrl} liveDemoUrl={submission.liveDemoUrl} submittedAt={submission.submittedAt} />
              </Card>
            </>
          )}
        </div>
      </div>

      <ConfirmModal
        open={confirmStart}
        title="Taskni boshlaysizmi?"
        text={
          <span className="flex flex-col gap-2 mt-1" role="radiogroup" aria-label="Rejim">
            {([false, true] as const).map((v) => (
              <label
                key={String(v)}
                className={cx("flex gap-3 p-3 rounded-xl border cursor-pointer", timed === v ? "border-brand bg-brand-tint" : "border-line hover:border-ink-2")}
              >
                <input type="radio" name="mode" checked={timed === v} onChange={() => setTimed(v)} className="mt-1 accent-[var(--color-brand)]" />
                <span>
                  <span className="block text-sm font-semibold text-ink">{v ? `Taymer bilan — ${formatDuration(task.estimatedTime)}` : "Erkin rejim — 7 kun"}</span>
                  <span className="block text-xs text-muted mt-0.5">
                    {v ? "Suhbatdagi test topshiriq kabi: vaqt tugasa task bajarilmagan hisoblanadi." : "O'z sur'atingizda ishlang. Muddat — 7 kun."}
                  </span>
                </span>
              </label>
            ))}
          </span>
        }
        confirmLabel="Boshlash"
        loading={starting}
        onConfirm={start}
        onClose={() => setConfirmStart(false)}
      />
      <UpgradeModal open={!!upgrade} message={upgrade || undefined} onClose={() => setUpgrade(null)} />
    </div>
  );
}

function SubmissionLinks({ githubUrl, liveDemoUrl, submittedAt }: { githubUrl?: string | null; liveDemoUrl?: string | null; submittedAt?: string | null }) {
  return (
    <div className="flex flex-col gap-1.5 text-xs">
      {githubUrl && (
        <a href={githubUrl} target="_blank" rel="noreferrer" className="text-brand hover:underline truncate">
          Yechim: {githubUrl}
        </a>
      )}
      {liveDemoUrl && (
        <a href={liveDemoUrl} target="_blank" rel="noreferrer" className="text-brand hover:underline truncate">
          Demo: {liveDemoUrl}
        </a>
      )}
      {submittedAt && <span className="text-muted">Yuborilgan: {formatDate(submittedAt, true)}</span>}
    </div>
  );
}

function SubmitPanel({ task, submissionId, offset, onDone }: { task: UserTask; submissionId: string; offset: number; onDone: () => void }) {
  const toast = useToast();
  const [expired, setExpired] = useState(false);
  const left = useCountdown(task.dueAt, offset, () => setExpired(true));
  const [githubUrl, setGithubUrl] = useState("");
  const [liveDemoUrl, setLiveDemoUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [method, setMethod] = useState<"mentor" | "ai">("mentor");
  const [mentorId, setMentorId] = useState("");
  const [mentors, setMentors] = useState<Mentor[] | null>(null);
  const [mentorsError, setMentorsError] = useState("");
  const [aiAvailable, setAiAvailable] = useState(true);
  const isDesign = !task.sandbox?.enabled && task.deliverable === "design";
  const [images, setImages] = useState<DesignImage[]>(task.submission?.designImages || []);

  useEffect(() => {
    submissionApi
      .aiStatus()
      .then((r) => {
        setAiAvailable(r.available);
        if (!r.available) setMethod("mentor");
      })
      .catch(() => undefined);
  }, []);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    mentorApi
      .list(task.track)
      .then((list) => {
        setMentors(list);
        setMentorsError("");
      })
      .catch((e) => {
        setMentors([]);
        setMentorsError(errorMessage(e, "Mentorlar ro'yxatini yuklab bo'lmadi"));
      });
  }, [task.track]);

  // Vaqt tugaganda serverdan yangi holatni olamiz (task "bajarilmagan"ga o'tadi)
  useEffect(() => {
    if (expired) {
      toast.error("Ajratilgan vaqt tugadi. Task bajarilmaganlar ro'yxatiga o'tkazildi");
      const t = setTimeout(onDone, 1500);
      return () => clearTimeout(t);
    }
  }, [expired, onDone, toast]);

  // Erkin rejimda muddat 7 kun (taymer task vaqti emas)
  const total = (task.submission?.timed === false ? Math.max(task.estimatedTime, 7 * 24 * 60) : task.estimatedTime) * 60;
  const pct = total ? Math.min(100, (left / total) * 100) : 0;
  const urgent = left < Math.min(600, total * 0.15);
  const aiAllowed = useMemo(() => (isDesign ? images.length > 0 : isGitHub(githubUrl)), [isDesign, images.length, githubUrl]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const url = githubUrl.trim();
    if (isDesign) {
      if (!url && !images.length) return toast.error("Figma havolasini kiriting yoki maket rasmlarini yuklang");
      if (url && !/^https?:\/\/\S+$/.test(url)) return toast.error("Havola noto'g'ri (https://...)");
    } else if (!/^https?:\/\/\S+$/.test(url)) return toast.error("Yechim havolasini to'g'ri kiriting (https://...)");
    if (liveDemoUrl && !/^https?:\/\/\S+$/.test(liveDemoUrl.trim())) return toast.error("Demo havolasi noto'g'ri");
    if (method === "mentor" && !mentorId) return toast.error("Tekshiruvchi mentorni tanlang");
    if (method === "ai" && !aiAllowed)
      return toast.error(isDesign ? "AI dizaynni ko'rishi uchun maket rasmlarini yuklang" : "AI tekshiruvi uchun GitHub repozitoriy havolasi kerak");
    setSending(true);
    try {
      await submissionApi.submit(submissionId, {
        githubUrl: githubUrl.trim() || undefined,
        liveDemoUrl: liveDemoUrl.trim() || undefined,
        notes: notes.trim() || undefined,
        reviewMethod: method,
        mentorId: method === "mentor" ? mentorId : undefined,
      });
      toast.success(method === "mentor" ? "Yechim mentorga yuborildi" : "AI tekshiruvi boshlandi");
      onDone();
    } catch (err) {
      toast.error(errorMessage(err));
      if (errorCode(err) === "DEADLINE_OVER") onDone();
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Card className={cx("p-5", urgent ? "border-rose-200" : "border-brand/30")}>
        <p className="text-[13px] text-muted">Qolgan vaqt</p>
        <p className={cx("font-mono text-3xl font-bold mt-1", urgent ? "text-rose-600" : "text-brand")}>{formatCountdown(left)}</p>
        <div className="mt-3 h-1.5 rounded-full bg-line overflow-hidden">
          <div className={cx("h-full rounded-full transition-all", urgent ? "bg-rose-500" : "bg-brand")} style={{ width: `${pct}%` }} />
        </div>
        <p className="text-[11px] text-muted mt-2">Muddat: {formatDate(task.dueAt, true)}</p>
      </Card>

      <Card className="p-5">
        <h3 className="text-sm font-bold text-ink mb-4">{task.sandbox?.enabled ? "Yoki havola orqali yuborish" : "Yechimni tekshirishga yuborish"}</h3>
        <form onSubmit={submit} className="flex flex-col gap-4">
          {isDesign ? (
            <>
              <Field label="Figma havolasi" hint={`Share → "Anyone with the link can view" qilib nusxalang`}>
                <Input value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} placeholder="https://www.figma.com/design/..." inputMode="url" />
              </Field>
              <Field label="Maket rasmlari" hint="Har bir ekran/kadrni PNG qilib eksport qiling — AI va mentor aynan shu rasmlarni ko'radi">
                <DesignUpload submissionId={submissionId} images={images} onChange={setImages} disabled={expired} />
              </Field>
            </>
          ) : (
            <>
              <Field label="Yechim havolasi *" hint="GitHub repozitoriy yoki boshqa havola">
                <Input value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} placeholder="https://github.com/username/repo" inputMode="url" />
              </Field>
              <Field label="Demo havola (ixtiyoriy)">
                <Input value={liveDemoUrl} onChange={(e) => setLiveDemoUrl(e.target.value)} placeholder="https://my-app.vercel.app" inputMode="url" />
              </Field>
            </>
          )}
          <Field label="Izoh (ixtiyoriy)">
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Mentor uchun qo'shimcha ma'lumot..." className="min-h-[70px]" />
          </Field>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-ink-2">Kim tekshirsin?</span>
            <div className="grid grid-cols-2 gap-2">
              {(["mentor", "ai"] as const).map((m) => {
                const off = m === "ai" && !aiAvailable;
                return (
                  <button
                    key={m}
                    type="button"
                    disabled={off}
                    onClick={() => setMethod(m)}
                    className={cx(
                      "p-3 rounded-xl border text-left",
                      off ? "border-line opacity-50 cursor-not-allowed" : "cursor-pointer",
                      method === m ? "border-brand bg-brand-tint" : !off && "border-line hover:border-ink-2",
                    )}
                  >
                    <span className="block text-sm font-semibold text-ink">{m === "mentor" ? "Mentor" : "AI"}</span>
                    <span className="block text-[11px] text-muted">
                      {m === "mentor" ? (isDesign ? "Batafsil dizayn tahlili" : "Batafsil code review") : off ? "Hozircha mavjud emas" : isDesign ? "Rasmlarni ko'rib baholaydi" : "Tezkor, faqat GitHub"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {method === "mentor" &&
            (mentors === null ? (
              <PageLoader label="Mentorlar..." />
            ) : mentorsError ? (
              <Alert tone="danger">{mentorsError}</Alert>
            ) : <MentorSelector mentors={mentors} selectedId={mentorId} onSelect={setMentorId} />)}
          {method === "ai" && !aiAllowed && (isDesign ? <Alert tone="warning">AI baholashi uchun kamida bitta maket rasmini yuklang.</Alert> : githubUrl && <Alert tone="warning">AI faqat GitHub repozitoriy havolasini tekshira oladi.</Alert>)}

          <Button type="submit" size="lg" loading={sending} disabled={expired}>
            Tekshirishga yuborish
          </Button>
        </form>
      </Card>
    </>
  );
}

/** AI tekshiruvi bajarilmadi: qayta urinish yoki mentorga yuborish */
function AiFailedPanel({ task, submission, onDone }: { task: UserTask; submission: Submission; onDone: () => void }) {
  const toast = useToast();
  const [mentors, setMentors] = useState<Mentor[] | null>(null);
  const [mentorId, setMentorId] = useState("");
  const [busy, setBusy] = useState<"" | "retry" | "mentor">("");

  useEffect(() => {
    mentorApi
      .list(task.track)
      .then(setMentors)
      .catch(() => setMentors([]));
  }, [task.track]);

  const retry = async () => {
    setBusy("retry");
    try {
      await submissionApi.retryAi(submission._id);
      toast.success("AI tekshiruvi qayta boshlandi");
      onDone();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy("");
    }
  };

  const toMentor = async () => {
    if (!mentorId) return toast.error("Tekshiruvchi mentorni tanlang");
    setBusy("mentor");
    try {
      await submissionApi.toMentor(submission._id, mentorId);
      toast.success("Yechim mentorga yuborildi");
      onDone();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy("");
    }
  };

  return (
    <Card className="p-5 flex flex-col gap-4">
      <div>
        <div className="flex items-center gap-2 text-sm font-bold text-ink">
          <HiOutlineCpuChip className="text-ink-2" size={20} /> AI tekshiruvi bajarilmadi
        </div>
        <p className="text-xs text-muted mt-1.5">Yechimingiz saqlangan. Qayta urinib ko'ring yoki uni mentorga yuboring.</p>
      </div>
      <Alert tone="danger">{submission.aiFeedback?.error}</Alert>
      <Button variant="secondary" loading={busy === "retry"} disabled={!!busy} onClick={retry}>
        Qayta urinish
      </Button>
      <div className="border-t border-line pt-4 flex flex-col gap-3">
        <span className="text-xs font-semibold text-ink-2">Mentorga yuborish</span>
        {mentors === null ? <PageLoader label="Mentorlar..." /> : <MentorSelector mentors={mentors} selectedId={mentorId} onSelect={setMentorId} />}
        <Button loading={busy === "mentor"} disabled={!!busy || !mentors?.length} onClick={toMentor}>
          Mentorga yuborish
        </Button>
      </div>
      <SubmissionLinks githubUrl={submission.githubUrl} liveDemoUrl={submission.liveDemoUrl} submittedAt={submission.submittedAt} />
    </Card>
  );
}
