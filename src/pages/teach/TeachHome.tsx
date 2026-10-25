import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { HiOutlineAcademicCap, HiOutlineArchiveBox, HiOutlinePlus, HiOutlineTrash, HiOutlineUserGroup } from "react-icons/hi2";
import { errorMessage, orgApi } from "../../api/api";
import { invalidateCache, useCachedQuery } from "../../hooks/useCachedQuery";
import { useOrgMe } from "../../hooks/useOrgMe";
import { getStoredUser } from "../../lib/auth";
import { SUPPORT_USERNAME } from "../../lib/constants";
import { formatDate } from "../../lib/format";
import type { OrgBrief, OrgDetail, OrgGroupSummary } from "../../types/type";
import { Alert, Avatar, Badge, Button, Card, ConfirmModal, EmptyState, ErrorState, Field, Input, Modal, PageHeader, PageLoader, ProgressBar, Select, Textarea, cx } from "../../components/ui";
import { useToast } from "../../components/ui/toast";
import InviteLink from "../../components/teach/InviteLink";

/** Markaz holati: pilot / faol / to'xtatilgan va muddat */
export function OrgStatusLine({ org }: { org: OrgBrief }) {
  const [now] = useState(Date.now);
  if (!org.active) {
    return (
      <Alert tone="danger">
        Markaz obunasi {org.status === "suspended" ? "to'xtatilgan" : `${formatDate(org.activeUntil)} da tugagan`}. Jadval va yechimlar ko'rinadi, lekin yangi guruh, topshiriq va
        talaba qo'shib bo'lmaydi. Uzaytirish uchun{" "}
        <a href={`https://t.me/${SUPPORT_USERNAME}`} target="_blank" rel="noreferrer" className="font-semibold underline">
          DevReady bilan bog'laning
        </a>
        .
      </Alert>
    );
  }
  const days = Math.ceil((new Date(org.activeUntil).getTime() - now) / 86400000);
  return (
    <p className="text-[14px] text-muted">
      {org.status === "pilot" ? "Bepul sinov davri" : "Obuna faol"} — {formatDate(org.activeUntil)} gacha
      {days <= 7 && <span className="text-amber-700 font-semibold"> ({days} kun qoldi)</span>}
    </p>
  );
}

export default function TeachHome() {
  const me = useOrgMe();
  const [params, setParams] = useSearchParams();
  const orgs = me.data?.orgs || [];
  const orgId = params.get("org") || orgs[0]?.id || "";

  if (me.loading) return <PageLoader />;
  if (me.error) return <ErrorState message={me.error} onRetry={me.refetch} />;
  if (!orgs.length) {
    return (
      <Card>
        <EmptyState
          icon={<HiOutlineAcademicCap />}
          title="Siz hali o'quv markaziga biriktirilmagansiz"
          text="Markazingiz DevReady bilan ishlasa, uning egasi sizni telefon raqamingiz orqali o'qituvchi qilib qo'shadi. Markazingizni ulamoqchi bo'lsangiz — bizga yozing."
          action={
            <a href={`https://t.me/${SUPPORT_USERNAME}`} target="_blank" rel="noreferrer" className="text-sm font-semibold text-brand hover:underline">
              Telegram orqali yozish
            </a>
          }
        />
      </Card>
    );
  }
  return <OrgHome key={orgId} orgId={orgId} orgs={orgs} onSwitch={(id) => setParams({ org: id })} />;
}

function OrgHome({ orgId, orgs, onSwitch }: { orgId: string; orgs: OrgBrief[]; onSwitch: (id: string) => void }) {
  const q = useCachedQuery(`teach:org:${orgId}`, () => orgApi.detail(orgId), { staleTime: 15_000 });
  const [creating, setCreating] = useState(false);
  const [showArchive, setShowArchive] = useState(false);

  if (q.loading) return <PageLoader />;
  if (q.error || !q.data) return <ErrorState message={q.error || "Markaz topilmadi"} onRetry={q.refetch} />;
  const { org, groups, members } = q.data;
  const active = groups.filter((g) => !g.archived);
  const archived = groups.filter((g) => g.archived);
  const isOwner = org.role === "owner";
  const used = org.usedSeats || 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={org.name}
        subtitle={<OrgStatusLine org={org} />}
        actions={
          <div className="flex flex-wrap gap-2">
            {orgs.length > 1 && (
              <Select value={orgId} onChange={(e) => onSwitch(e.target.value)} className="w-56" aria-label="Markaz">
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </Select>
            )}
            <Button onClick={() => setCreating(true)} disabled={!org.active}>
              <HiOutlinePlus size={18} /> Yangi guruh
            </Button>
          </div>
        }
      />

      <div className="grid sm:grid-cols-3 gap-3">
        <Card className="p-4">
          <p className="text-[13px] text-muted">Talabalar o'rni</p>
          <p className="text-2xl font-bold text-ink tabular-nums mt-1">
            {used} <span className="text-base font-medium text-muted">/ {org.seats}</span>
          </p>
          <div className="mt-2">
            <ProgressBar value={used} max={org.seats} tone={used >= org.seats ? "danger" : used / org.seats > 0.85 ? "warning" : "success"} />
          </div>
        </Card>
        <Card className="p-4">
          <p className="text-[13px] text-muted">Faol guruhlar</p>
          <p className="text-2xl font-bold text-ink tabular-nums mt-1">{active.length}</p>
          <p className="text-[12px] text-muted mt-1">{isOwner ? "Markazdagi barcha guruhlar" : "Sizga biriktirilgan guruhlar"}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[13px] text-muted">Bahoingizni kutayotgan yechimlar</p>
          <p className={cx("text-2xl font-bold tabular-nums mt-1", active.some((g) => g.toReview) ? "text-amber-700" : "text-ink")}>{active.reduce((n, g) => n + g.toReview, 0)}</p>
          <p className="text-[12px] text-muted mt-1">O'qituvchi baholaydigan topshiriqlardan</p>
        </Card>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold text-ink">Guruhlar</h2>
        {!active.length ? (
          <Card>
            <EmptyState
              icon={<HiOutlineUserGroup />}
              title="Hali guruh yo'q"
              text="Guruh yarating, taklif havolasini talabalarga yuboring va birinchi topshiriqni bering."
              action={
                <Button onClick={() => setCreating(true)} disabled={!org.active}>
                  <HiOutlinePlus size={18} /> Guruh yaratish
                </Button>
              }
            />
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {active.map((g) => (
              <GroupRow key={g.id} g={g} />
            ))}
          </div>
        )}
        {!!archived.length && (
          <div>
            <button type="button" onClick={() => setShowArchive((v) => !v)} className="inline-flex items-center gap-2 text-[13px] text-muted hover:text-ink cursor-pointer">
              <HiOutlineArchiveBox size={16} /> Arxiv ({archived.length}) {showArchive ? "— yashirish" : "— ko'rsatish"}
            </button>
            {showArchive && (
              <div className="flex flex-col gap-2 mt-3">
                {archived.map((g) => (
                  <GroupRow key={g.id} g={g} />
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {isOwner && <Teachers orgId={orgId} members={members} onChanged={q.refetch} />}

      <CreateGroupModal
        open={creating}
        orgId={orgId}
        onClose={() => setCreating(false)}
        onCreated={() => {
          setCreating(false);
          q.refetch();
          invalidateCache("org:my");
        }}
      />
    </div>
  );
}

function GroupRow({ g }: { g: OrgGroupSummary }) {
  return (
    <Card className={cx("p-4 sm:p-5 flex flex-col md:flex-row md:items-center gap-4", g.archived && "opacity-70")}>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link to={`/teach/groups/${g.id}`} className="text-[17px] font-bold text-ink hover:text-brand">
            {g.name}
          </Link>
          {g.archived && <Badge>Arxivda</Badge>}
          {!g.archived && !g.inviteOpen && <Badge tone="neutral">Havola yopiq</Badge>}
          {g.toReview > 0 && <Badge tone="warning">{g.toReview} ta yechim bahoni kutyapti</Badge>}
        </div>
        <p className="text-[13px] text-muted mt-1">
          {g.students} talaba · {g.openAssignments} ta ochiq topshiriq{g.assignments > g.openAssignments ? `, ${g.assignments - g.openAssignments} ta yopilgan` : ""}
          {g.teachers.length ? ` · ${g.teachers.map((t) => t.name).join(", ")}` : ""}
        </p>
      </div>
      <div className="flex items-center gap-4 shrink-0">
        {!g.archived && <InviteLink code={g.inviteCode} open={g.inviteOpen} compact />}
        <Link to={`/teach/groups/${g.id}`} className="h-9 px-4 rounded-full bg-brand-tint text-brand text-sm font-semibold inline-flex items-center hover:bg-brand-100">
          Ochish
        </Link>
      </div>
    </Card>
  );
}

function CreateGroupModal({ open, orgId, onClose, onCreated }: { open: boolean; orgId: string; onClose: () => void; onCreated: () => void }) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!name.trim()) return toast.error("Guruh nomini kiriting");
    setSaving(true);
    try {
      const r = await orgApi.createGroup(orgId, { name: name.trim(), description: description.trim() });
      toast.success(r.message);
      setName("");
      setDescription("");
      onCreated();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Yangi guruh"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button onClick={() => submit()} loading={saving}>
            Yaratish
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Guruh nomi">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Masalan: Backend N-12 (kechki)" maxLength={80} autoFocus />
        </Field>
        <Field label="Tavsif (ixtiyoriy)" hint="Talabalar qo'shilish sahifasida ko'radi">
          <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} placeholder="Dushanba, chorshanba, juma — 18:00" />
        </Field>
      </form>
    </Modal>
  );
}

function Teachers({ orgId, members, onChanged }: { orgId: string; members: OrgDetail["members"]; onChanged: () => void }) {
  const toast = useToast();
  const me = getStoredUser();
  const [phone, setPhone] = useState("");
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<OrgDetail["members"][number] | null>(null);
  const [busy, setBusy] = useState(false);

  const add = async (e: FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return toast.error("Telefon raqamni kiriting");
    setAdding(true);
    try {
      const r = await orgApi.addTeacher(orgId, phone.trim());
      toast.success(`${r.data.name} o'qituvchi sifatida qo'shildi`);
      setPhone("");
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setAdding(false);
    }
  };

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-bold text-ink">O'qituvchilar</h2>
      <Card className="p-5 flex flex-col gap-4">
        <ul className="flex flex-col divide-y divide-line">
          {members.map((m) => (
            <li key={m.userId} className="flex items-center gap-3 py-3 first:pt-0">
              <Avatar name={m.name} src={m.avatar} size={36} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink truncate">
                  {m.name} {m.userId === (me?._id || me?.id) && <span className="text-muted font-normal">(siz)</span>}
                </p>
                <p className="text-xs text-muted">
                  {m.role === "owner" ? "Markaz egasi" : "O'qituvchi"} · {m.phone} · {m.groups || 0} ta guruh
                </p>
              </div>
              {m.role === "teacher" && (
                <button type="button" onClick={() => setRemoving(m)} className="p-2 rounded-full text-muted hover:text-rose-600 hover:bg-rose-50 cursor-pointer" aria-label={`${m.name} ni o'chirish`}>
                  <HiOutlineTrash size={18} />
                </button>
              )}
            </li>
          ))}
        </ul>
        <form onSubmit={add} className="flex flex-col sm:flex-row gap-2 sm:items-end border-t border-line pt-4">
          <Field label="O'qituvchi qo'shish" hint="U avval devready.uz'da ro'yxatdan o'tgan bo'lishi kerak" className="flex-1">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+998 90 123 45 67" inputMode="tel" aria-label="O'qituvchi telefoni" />
          </Field>
          <Button type="submit" loading={adding} className="sm:mb-[22px]">
            Qo'shish
          </Button>
        </form>
      </Card>
      <ConfirmModal
        open={!!removing}
        title="O'qituvchini o'chirasizmi?"
        text={`${removing?.name || ""} markazdan va barcha guruhlardan chiqariladi. Guruhlar, topshiriqlar va yechimlar saqlanib qoladi.`}
        confirmLabel="O'chirish"
        danger
        loading={busy}
        onConfirm={async () => {
          if (!removing) return;
          setBusy(true);
          try {
            await orgApi.removeMember(orgId, removing.userId);
            toast.success("O'qituvchi o'chirildi");
            setRemoving(null);
            onChanged();
          } catch (err) {
            toast.error(errorMessage(err));
          } finally {
            setBusy(false);
          }
        }}
        onClose={() => setRemoving(null)}
      />
    </section>
  );
}
