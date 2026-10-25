import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { HiOutlineArrowLeft, HiOutlineBellAlert, HiOutlineClipboardDocumentList, HiOutlinePencilSquare, HiOutlinePlus, HiOutlineTrash, HiOutlineUserGroup } from "react-icons/hi2";
import { errorCode, errorMessage, orgApi } from "../../api/api";
import { invalidateCache, useCachedQuery } from "../../hooks/useCachedQuery";
import { DIFFICULTY } from "../../lib/constants";
import { formatDate, timeAgo } from "../../lib/format";
import type { GroupAssignment, GroupStudent, GroupView, OrgMember } from "../../types/type";
import { Alert, Avatar, Badge, Button, Card, ConfirmModal, EmptyState, ErrorState, Field, Input, Modal, PageLoader, ProgressBar, Tabs, Textarea, Toggle, cx } from "../../components/ui";
import { useToast } from "../../components/ui/toast";
import InviteLink from "../../components/teach/InviteLink";
import ProgressMatrix from "../../components/teach/ProgressMatrix";
import AssignModal from "../../components/teach/AssignModal";
import TeacherReviewModal from "../../components/teach/TeacherReviewModal";
import { REVIEW_MODE, fromLocalInput, timeLeft, toLocalInput } from "../../components/teach/cells";
import { OrgStatusLine } from "./TeachHome";

type Tab = "progress" | "assignments" | "students" | "settings";

export default function GroupPage() {
  const { id = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const toast = useToast();
  const q = useCachedQuery(`teach:group:${id}`, () => orgApi.group(id), { staleTime: 10_000 });
  const [tab, setTab] = useState<Tab>("progress");
  const [assigning, setAssigning] = useState(false);
  const openId = params.get("open");
  const { refetch } = q;

  // Ochiq oyna bo'lmaganda jadval yarim daqiqada bir yangilanadi (AI natijalari, yangi yechimlar)
  useEffect(() => {
    if (openId || assigning) return;
    const t = setInterval(() => refetch(), 30_000);
    return () => clearInterval(t);
  }, [openId, assigning, refetch]);

  const view = q.data;
  const toReview = useMemo(() => {
    if (!view) return [] as string[];
    const out: string[] = [];
    for (const s of view.students) for (const a of view.assignments) if (view.cells[s.id]?.[a.id]?.needsTeacher) out.push(view.cells[s.id][a.id].submissionId!);
    return out;
  }, [view]);

  if (q.loading) return <PageLoader />;
  if (q.error || !view) return <ErrorState message={q.error || "Guruh topilmadi"} onRetry={q.refetch} />;
  const { group, org } = view;
  const refresh = () => {
    q.refetch();
    invalidateCache(`teach:org:${org.id}`);
  };
  const open = (submissionId: string | null) => {
    const next = new URLSearchParams(params);
    if (submissionId) next.set("open", submissionId);
    else next.delete("open");
    setParams(next, { replace: true });
  };

  const update = async (body: Parameters<typeof orgApi.updateGroup>[1], done?: string) => {
    try {
      await orgApi.updateGroup(group.id, body);
      if (done) toast.success(done);
      refresh();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link to={`/teach?org=${org.id}`} className="inline-flex items-center gap-2 text-xs font-semibold text-muted hover:text-ink mb-4">
          <HiOutlineArrowLeft /> {org.name}
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-[26px] sm:text-[32px] font-extrabold text-ink tracking-[-0.035em] leading-tight flex flex-wrap items-center gap-3">
              {group.name} {group.archived && <Badge>Arxivda</Badge>}
            </h1>
            <p className="text-[15px] text-muted mt-1.5">
              {view.students.length} talaba · {view.assignments.length} ta topshiriq
              {group.teachers.length ? ` · ${group.teachers.map((t) => t.name).join(", ")}` : ""}
            </p>
          </div>
          <Button onClick={() => setAssigning(true)} disabled={!org.active || group.archived}>
            <HiOutlinePlus size={18} /> Topshiriq berish
          </Button>
        </div>
      </div>

      {!org.active && <OrgStatusLine org={org} />}

      {!group.archived && (
        <Card className="p-5">
          <div className="flex flex-col lg:flex-row lg:items-start gap-4 lg:gap-8">
            <div className="lg:w-64 shrink-0">
              <h2 className="text-[15px] font-bold text-ink">Taklif havolasi</h2>
              <p className="text-[13px] text-muted mt-1">Guruh chatiga yuboring. Talaba ro'yxatdan o'tadi va bir bosishda qo'shiladi.</p>
            </div>
            <div className="flex-1 min-w-0">
              <InviteLink
                code={group.inviteCode}
                open={group.inviteOpen && org.active}
                onToggle={(v) => update({ inviteOpen: v }, v ? "Havola ochildi" : "Havola yopildi")}
                onReset={async () => {
                  try {
                    const r = await orgApi.resetInvite(group.id);
                    toast.success(r.message);
                    refresh();
                  } catch (e) {
                    toast.error(errorMessage(e));
                  }
                }}
              />
            </div>
          </div>
        </Card>
      )}

      {toReview.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-[18px] border border-amber-200 bg-amber-50 px-5 py-4">
          <p className="text-[14px] text-amber-800">
            <b>{toReview.length} ta yechim</b> bahoingizni kutyapti. Talabalar natijani shundan keyin ko'radi.
          </p>
          <Button size="sm" onClick={() => open(toReview[0])}>
            Baholashni boshlash
          </Button>
        </div>
      )}

      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: "progress", label: "Nazorat" },
          { value: "assignments", label: "Topshiriqlar", count: view.assignments.length },
          { value: "students", label: "Talabalar", count: view.students.length },
          { value: "settings", label: "Sozlamalar" },
        ]}
      />

      {tab === "progress" &&
        (!view.students.length ? (
          <Card>
            <EmptyState icon={<HiOutlineUserGroup />} title="Guruhda hali talaba yo'q" text="Yuqoridagi taklif havolasini talabalarga yuboring — ular qo'shilgach shu yerda ko'rinadi." />
          </Card>
        ) : !view.assignments.length ? (
          <Card>
            <EmptyState
              icon={<HiOutlineClipboardDocumentList />}
              title="Hali topshiriq berilmagan"
              text="Katalogdan task tanlang va muddat qo'ying. Talabalar Telegram'da xabar oladi."
              action={
                <Button onClick={() => setAssigning(true)} disabled={!org.active}>
                  <HiOutlinePlus size={18} /> Birinchi topshiriqni berish
                </Button>
              }
            />
          </Card>
        ) : (
          <ProgressMatrix view={view} onOpen={open} />
        ))}

      {tab === "assignments" && <Assignments view={view} onChanged={refresh} onAssign={() => setAssigning(true)} />}
      {tab === "students" && <Students view={view} onChanged={refresh} />}
      {tab === "settings" && <Settings view={view} onChanged={refresh} update={update} />}

      <AssignModal
        open={assigning}
        onClose={() => setAssigning(false)}
        groupId={group.id}
        assignedTaskIds={view.assignments.map((a) => a.task.id)}
        onAssigned={() => {
          setAssigning(false);
          setTab("progress");
          refresh();
        }}
      />
      <TeacherReviewModal submissionId={openId} onClose={() => open(null)} onChanged={refresh} />
    </div>
  );
}

/* ───────── Topshiriqlar ───────── */

function Assignments({ view, onChanged, onAssign }: { view: GroupView; onChanged: () => void; onAssign: () => void }) {
  const toast = useToast();
  const [editing, setEditing] = useState<GroupAssignment | null>(null);
  const [removing, setRemoving] = useState<GroupAssignment | null>(null);
  const [busy, setBusy] = useState("");

  if (!view.assignments.length) {
    return (
      <Card>
        <EmptyState
          icon={<HiOutlineClipboardDocumentList />}
          title="Hali topshiriq yo'q"
          action={
            <Button onClick={onAssign} disabled={!view.org.active}>
              <HiOutlinePlus size={18} /> Topshiriq berish
            </Button>
          }
        />
      </Card>
    );
  }

  const remind = async (a: GroupAssignment) => {
    setBusy(a.id);
    try {
      const r = await orgApi.remind(a.id);
      toast.success(r.sent ? `${r.sent} ta talabaga eslatma yuborildi` : "Hamma yechim yuborgan — eslatma kerak emas");
      onChanged();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {view.assignments.map((a) => {
        const left = timeLeft(a.dueAt);
        const diff = DIFFICULTY[a.task.difficulty];
        const pending = a.stats.students - a.stats.submitted;
        return (
          <Card key={a.id} className="p-5 flex flex-col gap-4">
            <div className="flex flex-col md:flex-row md:items-start gap-3 justify-between">
              <div className="min-w-0">
                <p className="text-[16px] font-bold text-ink leading-snug">{a.task.title}</p>
                <div className="flex flex-wrap items-center gap-2 mt-2 text-[12px]">
                  <Badge>{a.task.track}</Badge>
                  <span className={cx("px-2 py-0.5 rounded-md border font-semibold", diff.className)}>{diff.label}</span>
                  <Badge tone={a.reviewMode === "teacher" ? "warning" : "info"}>{REVIEW_MODE[a.reviewMode].label}</Badge>
                  <span className={cx("font-semibold", left ? "text-ink-2" : "text-muted")}>
                    {left ? `Muddat: ${formatDate(a.dueAt, true)} (${left} qoldi)` : `Yopilgan: ${formatDate(a.dueAt, true)}`}
                  </span>
                </div>
                {a.note && <p className="text-[13px] text-ink-2 mt-2 whitespace-pre-line">Izoh: {a.note}</p>}
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => remind(a)}
                  loading={busy === a.id}
                  disabled={!a.open || pending === 0}
                  title={a.remindedAt ? `Oxirgi eslatma: ${timeAgo(a.remindedAt)}` : undefined}
                >
                  <HiOutlineBellAlert size={16} /> Eslatma
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditing(a)}>
                  <HiOutlinePencilSquare size={16} /> Tahrirlash
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setRemoving(a)} aria-label="O'chirish">
                  <HiOutlineTrash size={16} />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Metric label="Yubordi" value={`${a.stats.submitted} / ${a.stats.students}`}>
                <ProgressBar value={a.stats.submitted} max={Math.max(1, a.stats.students)} />
              </Metric>
              <Metric label="Qabul qilindi" value={String(a.stats.approved)} />
              <Metric label="O'rtacha ball" value={a.stats.avgScore === null ? "—" : String(a.stats.avgScore)} />
              <Metric label="Testlar o'rtacha" value={a.stats.avgTests === null ? "—" : `${a.stats.avgTests}%`} />
            </div>
            {a.stats.toReview > 0 && <Alert tone="warning">{a.stats.toReview} ta yechim bahoingizni kutyapti — "Nazorat" jadvalidagi sariq kataklarni bosing.</Alert>}
          </Card>
        );
      })}

      <EditAssignmentModal assignment={editing} onClose={() => setEditing(null)} onSaved={onChanged} />
      <ConfirmModal
        open={!!removing}
        title="Topshiriqni o'chirasizmi?"
        text="Hali hech kim yechim yubormagan bo'lsa o'chiriladi. Boshlagan talabalarning kodi saqlanib qoladi. Yechim yuborilgan bo'lsa — o'rniga muddatni o'zgartiring."
        confirmLabel="O'chirish"
        danger
        loading={busy === "remove"}
        onConfirm={async () => {
          if (!removing) return;
          setBusy("remove");
          try {
            await orgApi.deleteAssignment(removing.id);
            toast.success("Topshiriq o'chirildi");
            setRemoving(null);
            onChanged();
          } catch (e) {
            toast.error(errorMessage(e));
            setRemoving(null);
          } finally {
            setBusy("");
          }
        }}
        onClose={() => setRemoving(null)}
      />
    </div>
  );
}

function Metric({ label, value, children }: { label: string; value: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-mist border border-line p-3">
      <p className="text-[12px] text-muted">{label}</p>
      <p className="text-[18px] font-bold text-ink tabular-nums">{value}</p>
      {children && <div className="mt-1.5">{children}</div>}
    </div>
  );
}

function EditAssignmentModal({ assignment, onClose, onSaved }: { assignment: GroupAssignment | null; onClose: () => void; onSaved: () => void }) {
  if (!assignment) return null;
  return <EditAssignmentBody key={assignment.id} assignment={assignment} onClose={onClose} onSaved={onSaved} />;
}

function EditAssignmentBody({ assignment, onClose, onSaved }: { assignment: GroupAssignment; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [due, setDue] = useState(toLocalInput(assignment.dueAt));
  const [note, setNote] = useState(assignment.note);
  const [mode, setMode] = useState(assignment.reviewMode);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const body: Parameters<typeof orgApi.updateAssignment>[1] = { note, reviewMode: mode };
      if (due !== toLocalInput(assignment.dueAt)) body.dueAt = fromLocalInput(due);
      await orgApi.updateAssignment(assignment.id, body);
      toast.success("Saqlandi");
      onSaved();
      onClose();
    } catch (e) {
      toast.error(errorMessage(e));
      if (errorCode(e) === "ORG_INACTIVE") onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Topshiriqni tahrirlash"
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
        <p className="text-sm font-semibold text-ink">{assignment.task.title}</p>
        <Field label="Muddat (Toshkent vaqti)" hint="Uzaytirsangiz, muddati o'tgan talabalar ham qayta boshlay oladi">
          <Input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} aria-label="Muddat" />
        </Field>
        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-semibold text-ink-2">Kim baholaydi?</span>
          <div className="grid grid-cols-2 gap-2">
            {(["ai", "teacher"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={cx("p-3 rounded-xl border text-left text-sm font-semibold cursor-pointer", mode === m ? "border-brand bg-brand-tint text-ink" : "border-line text-ink-2 hover:border-ink-2")}
              >
                {REVIEW_MODE[m].label}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted">O'zgarish faqat bundan keyin yuboriladigan yechimlarga ta'sir qiladi.</p>
        </div>
        <Field label="Talabalarga izoh">
          <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} />
        </Field>
      </div>
    </Modal>
  );
}

/* ───────── Talabalar ───────── */

function Students({ view, onChanged }: { view: GroupView; onChanged: () => void }) {
  const toast = useToast();
  const [removing, setRemoving] = useState<GroupStudent | null>(null);
  const [busy, setBusy] = useState(false);

  if (!view.students.length) {
    return (
      <Card>
        <EmptyState icon={<HiOutlineUserGroup />} title="Guruhda hali talaba yo'q" text="Taklif havolasini yuboring — talabalar o'zi qo'shiladi." />
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <ul className="divide-y divide-line">
        {view.students.map((s) => {
          const st = view.studentStats[s.id];
          return (
            <li key={s.id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-3.5">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <Avatar name={s.name} src={s.avatar} size={38} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink truncate">
                    {s.name}
                    {s.username && (
                      <Link to={`/u/${s.username}`} target="_blank" className="ml-2 text-xs font-normal text-brand hover:underline">
                        @{s.username}
                      </Link>
                    )}
                  </p>
                  <p className="text-xs text-muted">
                    {s.direction || "Yo'nalish tanlanmagan"} · qo'shildi {formatDate(s.joinedAt)} · {s.lastActiveDate ? `faol ${timeAgo(s.lastActiveDate)}` : "hali faol emas"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-5 text-[13px] text-ink-2 tabular-nums">
                <span>
                  <b className="text-ink">{st?.approved || 0}</b>/{view.assignments.length} qabul
                </span>
                <span>O'rtacha: {st?.avgScore ?? "—"}</span>
                {st?.missed ? <span className="text-rose-600">{st.missed} qarz</span> : null}
                <button type="button" onClick={() => setRemoving(s)} className="p-2 rounded-full text-muted hover:text-rose-600 hover:bg-rose-50 cursor-pointer" aria-label={`${s.name} ni guruhdan chiqarish`}>
                  <HiOutlineTrash size={17} />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      <ConfirmModal
        open={!!removing}
        title="Talabani guruhdan chiqarasizmi?"
        text={`${removing?.name || ""} guruh topshiriqlarini ko'rmay qoladi va o'rni bo'shaydi. Uning yuborgan yechimlari va XP'si saqlanadi.`}
        confirmLabel="Chiqarish"
        danger
        loading={busy}
        onConfirm={async () => {
          if (!removing) return;
          setBusy(true);
          try {
            await orgApi.removeStudent(view.group.id, removing.id);
            toast.success("Talaba guruhdan chiqarildi");
            setRemoving(null);
            onChanged();
          } catch (e) {
            toast.error(errorMessage(e));
          } finally {
            setBusy(false);
          }
        }}
        onClose={() => setRemoving(null)}
      />
    </Card>
  );
}

/* ───────── Sozlamalar ───────── */

function Settings({ view, onChanged, update }: { view: GroupView; onChanged: () => void; update: (body: Parameters<typeof orgApi.updateGroup>[1], done?: string) => Promise<void> }) {
  const { group } = view;
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description);
  const [saving, setSaving] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const isOwner = view.role === "owner";
  const members = useCachedQuery(`teach:org:${view.org.id}`, () => orgApi.detail(view.org.id), { staleTime: 15_000, enabled: isOwner });
  const [teacherIds, setTeacherIds] = useState<string[]>(group.teachers.map((t) => t.id));

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await update({ name, description }, "Saqlandi");
    setSaving(false);
  };

  return (
    <div className="grid lg:grid-cols-2 gap-5 items-start">
      <Card className="p-5">
        <form onSubmit={save} className="flex flex-col gap-4">
          <h2 className="text-[15px] font-bold text-ink">Guruh ma'lumotlari</h2>
          <Field label="Nomi">
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
          </Field>
          <Field label="Tavsif" hint="Talabalar qo'shilish sahifasida ko'radi">
            <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} />
          </Field>
          <Button type="submit" loading={saving} className="self-start">
            Saqlash
          </Button>
        </form>
      </Card>

      <div className="flex flex-col gap-5">
        {isOwner && (
          <Card className="p-5 flex flex-col gap-3">
            <h2 className="text-[15px] font-bold text-ink">O'qituvchilar</h2>
            <p className="text-[13px] text-muted">Belgilangan o'qituvchilar guruhni boshqaradi, topshiriq beradi va yechimlarni baholaydi.</p>
            {members.loading ? (
              <PageLoader />
            ) : (
              <div className="flex flex-col gap-2">
                {(members.data?.members || []).map((m: OrgMember) => (
                  <label key={m.userId} className="flex items-center gap-3 text-sm text-ink cursor-pointer">
                    <input
                      type="checkbox"
                      checked={teacherIds.includes(m.userId)}
                      onChange={(e) => setTeacherIds((ids) => (e.target.checked ? [...ids, m.userId] : ids.filter((x) => x !== m.userId)))}
                      className="w-4 h-4 accent-[var(--color-brand)]"
                    />
                    {m.name} <span className="text-muted text-xs">{m.role === "owner" ? "ega" : "o'qituvchi"}</span>
                  </label>
                ))}
                <Button size="sm" variant="secondary" className="self-start mt-1" onClick={() => update({ teacherIds }, "O'qituvchilar saqlandi").then(onChanged)}>
                  Saqlash
                </Button>
              </div>
            )}
          </Card>
        )}

        <Card className="p-5 flex flex-col gap-3">
          <h2 className="text-[15px] font-bold text-ink">{group.archived ? "Guruh arxivda" : "Guruhni arxivlash"}</h2>
          <p className="text-[13px] text-muted">
            {group.archived
              ? "Talabalar topshiriqlarni ko'rmaydi va o'rin egallamaydi. Qaytarsangiz, hammasi avvalgidek ishlaydi."
              : "Kurs tugaganda arxivlang: talabalar o'rni bo'shaydi, natijalar va yechimlar saqlanib qoladi."}
          </p>
          {group.archived ? (
            <Toggle checked={false} onChange={() => update({ archived: false }, "Guruh arxivdan qaytarildi")} label="Arxivdan qaytarish" />
          ) : (
            <Button variant="danger" size="sm" className="self-start" onClick={() => setConfirmArchive(true)}>
              Arxivlash
            </Button>
          )}
        </Card>
      </div>

      <ConfirmModal
        open={confirmArchive}
        title="Guruhni arxivlaysizmi?"
        text="Talabalar guruh topshiriqlarini ko'rmay qoladi, taklif havolasi ishlamaydi va o'rinlar bo'shaydi. Natijalar saqlanadi, keyin qaytarish mumkin."
        confirmLabel="Arxivlash"
        danger
        onConfirm={async () => {
          setConfirmArchive(false);
          await update({ archived: true }, "Guruh arxivlandi");
        }}
        onClose={() => setConfirmArchive(false)}
      />
    </div>
  );
}
