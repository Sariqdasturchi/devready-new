import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { HiOutlineUserGroup } from "react-icons/hi2";
import { errorMessage, orgApi } from "../../api/api";
import { invalidateCache, useCachedQuery } from "../../hooks/useCachedQuery";
import { DIFFICULTY } from "../../lib/constants";
import { formatDate, formatDuration } from "../../lib/format";
import type { StudentAssignment, StudentGroup } from "../../types/type";
import { Badge, Button, Card, ConfirmModal, EmptyState, ErrorState, Input, PageHeader, PageLoader, cx } from "../../components/ui";
import { useToast } from "../../components/ui/toast";
import { CELL, REVIEW_MODE, timeLeft } from "../../components/teach/cells";

/** Talaba: o'quv markazidagi guruhlari va guruh topshiriqlari */
export default function Groups() {
  const q = useCachedQuery("org:student", orgApi.student, { staleTime: 10_000 });

  if (q.loading) return <PageLoader label="Guruh topshiriqlari..." />;
  if (q.error || !q.data) return <ErrorState message={q.error || "Yuklab bo'lmadi"} onRetry={q.refetch} />;
  const groups = q.data.groups;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Guruhim" subtitle="O'qituvchingiz bergan topshiriqlar. Ular tarif limitiga kirmaydi — muddatgacha bajaring." />
      {!groups.length ? <NoGroup /> : groups.map((g) => <GroupBlock key={g.id} group={g} onChanged={q.refetch} />)}
    </div>
  );
}

function NoGroup() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const go = (e: FormEvent) => {
    e.preventDefault();
    const c = code.trim().split("/").pop()?.toUpperCase();
    if (c) navigate(`/join/${c}`);
  };
  return (
    <Card>
      <EmptyState
        icon={<HiOutlineUserGroup />}
        title="Siz hali guruhda emassiz"
        text="O'qituvchingiz bergan taklif havolasini oching yoki kodini shu yerga kiriting."
        action={
          <form onSubmit={go} className="flex gap-2">
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Masalan: K7Q2M9XA" className="w-48 font-mono uppercase" aria-label="Taklif kodi" />
            <Button type="submit" disabled={!code.trim()}>
              Davom etish
            </Button>
          </form>
        }
      />
    </Card>
  );
}

function GroupBlock({ group, onChanged }: { group: StudentGroup; onChanged: () => void }) {
  const toast = useToast();
  const [leaving, setLeaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const open = group.assignments.filter((a) => a.open);
  const closed = group.assignments.filter((a) => !a.open);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-ink">{group.name}</h2>
          <p className="text-[13px] text-muted">
            {group.org.name}
            {group.teachers.length ? ` · o'qituvchi: ${group.teachers.join(", ")}` : ""}
          </p>
        </div>
        <button type="button" onClick={() => setLeaving(true)} className="text-[13px] text-muted hover:text-rose-600 cursor-pointer">
          Guruhdan chiqish
        </button>
      </div>
      {!group.org.active && (
        <p className="text-[13px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          Markaz obunasi hozir faol emas — yangi topshiriqni boshlab bo'lmaydi. Boshlaganlaringizni yuborishingiz mumkin.
        </p>
      )}
      {!group.assignments.length ? (
        <Card className="p-6 text-center text-sm text-muted">O'qituvchi hali topshiriq bermagan. Berilganda Telegram'ga xabar keladi.</Card>
      ) : (
        <div className="flex flex-col gap-3">
          {open.map((a) => (
            <AssignmentRow key={a.id} a={a} canStart={group.org.active} onChanged={onChanged} />
          ))}
          {!!closed.length && <p className="text-[13px] font-semibold text-muted mt-2">Muddati o'tgan</p>}
          {closed.map((a) => (
            <AssignmentRow key={a.id} a={a} canStart={false} onChanged={onChanged} />
          ))}
        </div>
      )}
      <ConfirmModal
        open={leaving}
        title="Guruhdan chiqasizmi?"
        text="Guruh topshiriqlari ro'yxatingizdan yo'qoladi. Bajargan yechimlaringiz va XP saqlanadi. Qaytish uchun yana taklif havolasi kerak bo'ladi."
        confirmLabel="Chiqish"
        danger
        loading={busy}
        onConfirm={async () => {
          setBusy(true);
          try {
            await orgApi.leave(group.id);
            toast.success("Guruhdan chiqdingiz");
            invalidateCache("org:my");
            setLeaving(false);
            onChanged();
          } catch (e) {
            toast.error(errorMessage(e));
          } finally {
            setBusy(false);
          }
        }}
        onClose={() => setLeaving(false)}
      />
    </section>
  );
}

function AssignmentRow({ a, canStart, onChanged }: { a: StudentAssignment; canStart: boolean; onChanged: () => void }) {
  const toast = useToast();
  const navigate = useNavigate();
  const [starting, setStarting] = useState(false);
  const [now] = useState(Date.now);
  const left = timeLeft(a.dueAt, now);
  const diff = DIFFICULTY[a.task.difficulty];
  const st = a.my.status;
  const cell = CELL[st];
  const finished = st === "approved" || st === "rejected";
  const startable = a.open && (st === "not_started" || st === "in_progress" || st === "rejected" || st === "expired");
  const urgent = a.open && !!left && new Date(a.dueAt).getTime() - now < 24 * 3600000 && (st === "not_started" || st === "in_progress");

  const start = async () => {
    setStarting(true);
    try {
      const r = await orgApi.start(a.id);
      invalidateCache("user:tasks", "org:student");
      navigate(a.task.kind === "repo" || a.task.kind === "design" ? `/dashboard/tasks/${r.taskId}` : `/dashboard/tasks/${r.taskId}/code`);
    } catch (e) {
      toast.error(errorMessage(e));
      onChanged();
    } finally {
      setStarting(false);
    }
  };

  const label = st === "in_progress" ? "Davom ettirish" : st === "rejected" || st === "expired" ? "Qayta urinish" : "Boshlash";
  const statusText =
    st === "not_started"
      ? "Boshlanmagan"
      : st === "missed"
        ? "Topshirilmadi"
        : st === "review"
          ? a.my.reviewMethod === "teacher"
            ? "O'qituvchi tekshirmoqda"
            : "Tekshiruvda"
          : finished
            ? `${cell.hint} · ${a.my.score}/100`
            : cell.hint;

  return (
    <Card className={cx("p-4 sm:p-5 flex flex-col md:flex-row md:items-center gap-4", urgent && "border-amber-300")}>
      <div className="min-w-0 flex-1">
        <Link to={`/dashboard/tasks/${a.task.id}`} className="text-[16px] font-bold text-ink hover:text-brand leading-snug">
          {a.task.title}
        </Link>
        <div className="flex flex-wrap items-center gap-2 mt-2 text-[12px]">
          <Badge>{a.task.track}</Badge>
          <span className={cx("px-2 py-0.5 rounded-md border font-semibold", diff.className)}>{diff.label}</span>
          <span className="text-muted">{formatDuration(a.task.estimatedTime)} · {a.task.xp} XP</span>
          <span className="text-muted">{REVIEW_MODE[a.reviewMode].label}</span>
        </div>
        {a.note && <p className="text-[13px] text-ink-2 mt-2 whitespace-pre-line">O'qituvchi: {a.note}</p>}
      </div>
      <div className="flex md:flex-col md:items-end items-center justify-between gap-2 shrink-0 md:min-w-[190px]">
        <div className="md:text-right">
          <p className={cx("text-[13px] font-semibold", urgent ? "text-amber-700" : a.open ? "text-ink" : "text-muted")}>
            {a.open ? `${left} qoldi` : "Muddat o'tgan"}
          </p>
          <p className="text-[12px] text-muted">
            {formatDate(a.dueAt, true)} · {statusText}
          </p>
        </div>
        {startable && canStart ? (
          <Button size="sm" onClick={start} loading={starting} variant={st === "in_progress" ? "secondary" : "primary"}>
            {label}
          </Button>
        ) : st !== "not_started" && st !== "missed" ? (
          <Link to={`/dashboard/tasks/${a.task.id}`} className="h-8 px-3 rounded-full border border-line text-[13px] font-semibold text-ink inline-flex items-center hover:border-ink-2">
            Natijani ko'rish
          </Link>
        ) : null}
      </div>
    </Card>
  );
}
