import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { HiOutlinePlus, HiOutlineTrophy } from "react-icons/hi2";
import {
  contestApi,
  errorMessage,
  submissionApi,
  taskApi,
  type ContestPayload,
} from "../../api/api";
import type {
  AdminContest,
  ContestStandings,
  ContestStatus,
  Submission,
  Task,
} from "../../types/type";
import { useCachedQuery } from "../../hooks/useCachedQuery";
import {
  Badge,
  Button,
  Card,
  ConfirmModal,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Modal,
  PageHeader,
  PageLoader,
  Select,
  Table,
  Textarea,
  Toggle,
} from "../../components/ui";
import { useToast } from "../../components/ui/toast";
import ReviewModal from "../../components/review/ReviewModal";

/* Vaqtlar Toshkent vaqtida kiritiladi va ko'rsatiladi (UTC+5, yozgi vaqt yo'q) */
const TZ_OFFSET_MS = 5 * 3600 * 1000;
const toInput = (iso: string) =>
  new Date(new Date(iso).getTime() + TZ_OFFSET_MS).toISOString().slice(0, 16);
const fromInput = (v: string) => new Date(`${v}:00+05:00`).toISOString();
const label = (iso: string) => toInput(iso).replace("T", " ");

/** Keyingi shanba 10:00 — yakshanba 22:00 (Toshkent) */
function nextWeekend() {
  const now = new Date(Date.now() + TZ_OFFSET_MS); // Toshkent "devor soati" UTC maydonlarida
  const days = (6 - now.getUTCDay() + 7) % 7 || 7;
  const sat = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + days,
      10,
      0,
    ),
  );
  const sun = new Date(sat.getTime() + 36 * 3600 * 1000);
  return {
    startAt: sat.toISOString().slice(0, 16),
    endAt: sun.toISOString().slice(0, 16),
  };
}

const STATUS: Record<
  ContestStatus,
  { label: string; tone: "neutral" | "warning" | "success" | "info" | "danger" }
> = {
  draft: { label: "Qoralama", tone: "neutral" },
  upcoming: { label: "Kutilmoqda", tone: "info" },
  live: { label: "Davom etmoqda", tone: "success" },
  ended: { label: "Natija kutilmoqda", tone: "warning" },
  finished: { label: "Yakunlangan", tone: "neutral" },
};

type Form = {
  title: string;
  description: string;
  taskId: string;
  startAt: string;
  endAt: string;
  timeLimitMin: number;
  published: boolean;
};

export default function SuperadminContests() {
  const toast = useToast();
  const q = useCachedQuery("admin:contests", contestApi.adminList, {
    staleTime: 10_000,
  });
  const [editing, setEditing] = useState<AdminContest | "new" | null>(null);
  const [results, setResults] = useState<AdminContest | null>(null);
  const [deleting, setDeleting] = useState<AdminContest | null>(null);

  if (q.loading) return <PageLoader />;
  if (!q.data)
    return <ErrorState message={q.error || "Xatolik"} onRetry={q.refetch} />;

  const remove = async () => {
    if (!deleting) return;
    try {
      const r = await contestApi.remove(deleting._id);
      toast.success(r.message);
      setDeleting(null);
      q.refetch();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Musobaqalar"
        subtitle="Haftalik musobaqa: bitta task, ochiq oyna va shaxsiy taymer. Task yaratilganda katalogdan yashiriladi, natija e'lon qilingach katalogga qaytadi."
        actions={
          <Button onClick={() => setEditing("new")}>
            <HiOutlinePlus /> Musobaqa yaratish
          </Button>
        }
      />
      <Card>
        {!q.data.length ? (
          <EmptyState
            icon={<HiOutlineTrophy />}
            title="Hali musobaqa yo'q"
            text="Avval Tasklar bo'limida taskni nofaol (qoralama) holatda yarating, keyin shu yerda musobaqaga biriktiring."
            action={
              <Button onClick={() => setEditing("new")}>
                Musobaqa yaratish
              </Button>
            }
          />
        ) : (
          <Table
            head={[
              "Musobaqa",
              "Task",
              "Vaqt (Toshkent)",
              "Ishtirok",
              "Holat",
              "",
            ]}
          >
            {q.data.map((c) => (
              <tr key={c._id} className="align-middle">
                <td className="px-4 py-3">
                  <p className="font-semibold text-ink">{c.title}</p>
                  <p className="text-[12px] text-muted">
                    {c.timeLimitMin} daqiqa har ishtirokchiga
                  </p>
                </td>
                <td className="px-4 py-3 text-ink-2 max-w-56">
                  <p className="truncate">
                    {c.task?.title || "O'chirilgan task"}
                  </p>
                  {c.task && (
                    <p className="text-[12px] text-muted">{c.task.track}</p>
                  )}
                </td>
                <td className="px-4 py-3 text-[13px] text-ink-2 whitespace-nowrap tabular-nums">
                  {label(c.startAt)}
                  <span className="block text-muted">{label(c.endAt)}</span>
                </td>
                <td className="px-4 py-3 tabular-nums whitespace-nowrap">
                  {c.submitted} / {c.started}
                  <span className="block text-[11px] text-muted">
                    yubordi / boshladi
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Badge tone={STATUS[c.status].tone}>
                    {STATUS[c.status].label}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    {c.status !== "draft" && c.status !== "upcoming" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setResults(c)}
                      >
                        Reyting
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditing(c)}
                    >
                      Tahrirlash
                    </Button>
                    {!c.started && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeleting(c)}
                      >
                        O'chirish
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <ContestModal
        contest={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          q.refetch();
        }}
      />
      {results && (
        <ResultsModal
          contest={results}
          onClose={() => setResults(null)}
          onChanged={q.refetch}
        />
      )}
      <ConfirmModal
        open={!!deleting}
        danger
        title="Musobaqani o'chirish"
        text={
          <>
            <b>{deleting?.title}</b> o'chiriladi. Uning taski nofaol (qoralama)
            holatga qaytadi.
          </>
        }
        confirmLabel="O'chirish"
        onConfirm={remove}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}

function ContestModal({
  contest,
  onClose,
  onSaved,
}: {
  contest: AdminContest | "new" | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState<Form | null>(null);
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [openedFor, setOpenedFor] = useState<AdminContest | "new" | null>(null);

  if (contest !== openedFor) {
    setOpenedFor(contest);
    if (contest === "new")
      setForm({
        title: "",
        description: "",
        taskId: "",
        ...nextWeekend(),
        timeLimitMin: 180,
        published: false,
      });
    else if (contest)
      setForm({
        title: contest.title,
        description: contest.description || "",
        taskId: contest.taskId || "",
        startAt: toInput(contest.startAt),
        endAt: toInput(contest.endAt),
        timeLimitMin: contest.timeLimitMin,
        published: contest.published,
      });
  }

  useEffect(() => {
    if (!contest || tasks) return;
    taskApi
      .all()
      .then((list) => setTasks(list.filter((t) => t.sandbox?.enabled)))
      .catch(() => setTasks([]));
  }, [contest, tasks]);

  const chosen = useMemo(
    () => tasks?.find((t) => t._id === form?.taskId),
    [tasks, form?.taskId],
  );
  if (!contest || !form) return null;
  const set = <K extends keyof Form>(k: K, v: Form[K]) =>
    setForm((f) => (f ? { ...f, [k]: v } : f));
  const started = contest !== "new" && contest.started > 0;

  const save = async () => {
    if (!form.title.trim() || !form.taskId)
      return toast.error("Nom va taskni kiriting");
    const body: ContestPayload = {
      title: form.title.trim(),
      description: form.description.trim(),
      taskId: form.taskId,
      startAt: fromInput(form.startAt),
      endAt: fromInput(form.endAt),
      timeLimitMin: Number(form.timeLimitMin),
      published: form.published,
    };
    setSaving(true);
    try {
      if (contest === "new") await contestApi.create(body);
      else await contestApi.update(contest._id, body);
      toast.success(contest === "new" ? "Musobaqa yaratildi" : "Saqlandi");
      onSaved();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={contest === "new" ? "Yangi musobaqa" : "Musobaqani tahrirlash"}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button onClick={save} loading={saving}>
            Saqlash
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Nomi">
          <Input
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="Hafta #1: Tabs komponenti"
            maxLength={120}
          />
        </Field>
        <Field label="Qisqa tavsif (ixtiyoriy)">
          <Textarea
            rows={2}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            maxLength={1000}
            placeholder="Frontend yo'nalishi, oson daraja"
          />
        </Field>
        <Field
          label="Task"
          hint={
            chosen && chosen.isActive && chosen.visibility !== "contest"
              ? "Bu task hozir katalogda ko'rinib turibdi. Saqlangach u katalogdan yashiriladi — yaxshisi, hali hech kim ko'rmagan yangi task tanlang."
              : "Faqat avtomatik testli tasklar. Task musobaqa tugaguncha katalogda ko'rinmaydi."
          }
        >
          <Select
            value={form.taskId}
            onChange={(e) => set("taskId", e.target.value)}
            disabled={started}
          >
            <option value="">
              {tasks ? "Taskni tanlang" : "Yuklanmoqda..."}
            </option>
            {tasks?.map((t) => (
              <option key={t._id} value={t._id}>
                {t.track} · {t.title}
                {!t.isActive
                  ? " (qoralama)"
                  : t.visibility === "contest"
                    ? " (musobaqa)"
                    : ""}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Boshlanish (Toshkent)">
            <Input
              type="datetime-local"
              value={form.startAt}
              onChange={(e) => set("startAt", e.target.value)}
            />
          </Field>
          <Field label="Tugash (Toshkent)">
            <Input
              type="datetime-local"
              value={form.endAt}
              onChange={(e) => set("endAt", e.target.value)}
            />
          </Field>
        </div>
        <Field
          label="Har ishtirokchiga vaqt (daqiqa)"
          hint="Taskni ochgan paytdan boshlab. Musobaqa tugash vaqtidan oshmaydi."
        >
          <Input
            type="number"
            min={15}
            max={1440}
            value={form.timeLimitMin}
            onChange={(e) => set("timeLimitMin", Number(e.target.value))}
          />
        </Field>
        <div className="flex flex-col gap-1">
          <Toggle
            checked={form.published}
            onChange={(v) => set("published", v)}
            label="E'lon qilingan"
          />
          <p className="text-[12px] text-muted">
            Yoqilganda musobaqa saytda ko'rinadi va barcha talabalarga Telegram
            eslatmalari boradi: 1 kun oldin, 1 soat oldin va boshlanganda.
          </p>
        </div>
      </div>
    </Modal>
  );
}

function ResultsModal({
  contest,
  onClose,
  onChanged,
}: {
  contest: AdminContest;
  onClose: () => void;
  onChanged: () => void;
}) {
  const toast = useToast();
  const [data, setData] = useState<ContestStandings | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [open, setOpen] = useState<Submission | null>(null);

  const load = () =>
    contestApi
      .leaderboard(contest._id)
      .then(setData)
      .catch((e) => setError(errorMessage(e)));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => void load(), [contest._id]);

  const toggleOut = async (userId: string, value: boolean) => {
    try {
      const r = await contestApi.disqualify(contest._id, userId, value);
      toast.success(r.message);
      load();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const openSubmission = async (id: string) => {
    try {
      setOpen(await submissionApi.get(id));
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const publish = async () => {
    setBusy(true);
    try {
      const r = await contestApi.publishResults(contest._id);
      toast.success(r.message);
      setConfirm(false);
      onChanged();
      onClose();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const canPublish = contest.status === "ended";
  return (
    <>
      <Modal
        open
        onClose={onClose}
        title={`Reyting: ${contest.title}`}
        size="xl"
        footer={
          <>
            <Button variant="secondary" onClick={onClose}>
              Yopish
            </Button>
            {canPublish && (
              <Button
                onClick={() => setConfirm(true)}
                disabled={!data?.rows.length}
              >
                Natijalarni e'lon qilish
              </Button>
            )}
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="text-[13px] text-ink-2 leading-relaxed">
            Testlar talaba brauzerida ishlaydi. E'lon qilishdan oldin birinchi
            o'rinlardagi yechimlarni oching va "Testlarni tekshirish" bilan
            qayta ishga tushiring. Natija tasdiqlanmasa yoki yechim ko'chirilgan
            bo'lsa, ishtirokchini chetlating.
          </p>
          {error ? (
            <ErrorState message={error} onRetry={load} />
          ) : !data ? (
            <PageLoader />
          ) : !data.rows.length ? (
            <EmptyState
              icon={<HiOutlineTrophy />}
              title="Hali yechim yo'q"
              text={`${data.started} kishi taskni ochgan, hech kim yubormagan.`}
            />
          ) : (
            <Table
              head={["O'rin", "Ishtirokchi", "Testlar", "Vaqt", "AI ball", ""]}
            >
              {data.rows.map((r) => (
                <tr
                  key={r.userId}
                  className={r.disqualified ? "opacity-60" : ""}
                >
                  <td className="px-4 py-3 font-bold tabular-nums">
                    {r.place ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    {r.username ? (
                      <Link
                        to={`/u/${r.username}`}
                        target="_blank"
                        className="font-medium text-ink hover:text-brand"
                      >
                        {r.name}
                      </Link>
                    ) : (
                      <span className="font-medium text-ink">{r.name}</span>
                    )}
                    {r.disqualified && (
                      <span className="block text-[11px] text-rose-600">
                        chetlatilgan
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {r.passed}/{r.total}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-ink-2">
                    {r.durationMin < 1 ? "<1" : r.durationMin} daq
                  </td>
                  <td className="px-4 py-3 tabular-nums text-ink-2">
                    {r.aiScore ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      {r.submissionId && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openSubmission(r.submissionId!)}
                        >
                          Yechim
                        </Button>
                      )}
                      {contest.status !== "finished" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleOut(r.userId, !r.disqualified)}
                        >
                          {r.disqualified ? "Qaytarish" : "Chetlatish"}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </div>
      </Modal>
      <ConfirmModal
        open={confirm}
        title="Natijalarni e'lon qilish"
        text="Birinchi 3 o'rin g'olib deb belgilanadi va ularning ochiq profilida chiqadi. Barcha ishtirokchilarga natija yuboriladi, task katalogga o'tadi. Buni qaytarib bo'lmaydi."
        confirmLabel="E'lon qilish"
        loading={busy}
        onConfirm={publish}
        onClose={() => setConfirm(false)}
      />
      <ReviewModal
        submission={open}
        onClose={() => setOpen(null)}
        onReviewed={() => (setOpen(null), load())}
      />
    </>
  );
}
