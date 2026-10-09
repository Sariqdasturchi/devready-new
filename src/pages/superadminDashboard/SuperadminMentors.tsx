import { useState } from "react";
import { HiOutlineAcademicCap, HiOutlinePlus } from "react-icons/hi2";
import { errorMessage, mentorApi, type MentorPayload } from "../../api/api";
import { useCachedQuery, invalidateCache } from "../../hooks/useCachedQuery";
import { Avatar, Badge, Button, Card, ConfirmModal, EmptyState, ErrorState, Field, Input, Modal, PageHeader, PageLoader, Select, Table, Textarea } from "../../components/ui";
import { useToast } from "../../components/ui/toast";
import { TRACKS } from "../../lib/constants";
import type { Mentor } from "../../types/type";

const EMPTY: MentorPayload = { fullName: "", phone: "+998", telegramId: "", direction: "Frontend", status: "active", bio: "" };

export default function SuperadminMentors() {
  const toast = useToast();
  const query = useCachedQuery<Mentor[]>("admin:mentors", mentorApi.all, { staleTime: 15_000 });
  const [editing, setEditing] = useState<Mentor | "new" | null>(null);
  const [form, setForm] = useState<MentorPayload>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Mentor | null>(null);

  const openNew = () => {
    setForm(EMPTY);
    setEditing("new");
  };
  const openEdit = (m: Mentor) => {
    setForm({ fullName: m.fullName, phone: m.phone, telegramId: m.telegramId || "", direction: m.direction || "Frontend", status: m.status, bio: m.bio || "" });
    setEditing(m);
  };

  const save = async () => {
    if (form.fullName.trim().length < 3) return toast.error("Ism kamida 3 ta harf");
    if (!/^\+998\d{9}$/.test(form.phone)) return toast.error("Telefon: +998XXXXXXXXX formatida");
    if (!/^\d{5,15}$/.test(form.telegramId)) return toast.error("Telegram ID faqat raqam (mentor @devreadyrobot da /start bosib oladi)");
    setSaving(true);
    try {
      if (editing === "new") {
        const m = await mentorApi.create(form);
        query.mutate((prev) => [m, ...(prev || [])]);
        toast.success("Mentor yaratildi. U telefon raqami orqali Telegram kod bilan kira oladi");
      } else if (editing) {
        const m = await mentorApi.update(editing._id, form);
        query.mutate((prev) => (prev || []).map((x) => (x._id === m._id ? m : x)));
        toast.success("Mentor yangilandi");
      }
      invalidateCache("admin:stats");
      setEditing(null);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (m: Mentor) => {
    try {
      const updated = await mentorApi.update(m._id, { status: m.status === "blocked" ? "active" : "blocked" });
      query.mutate((prev) => (prev || []).map((x) => (x._id === updated._id ? updated : x)));
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const remove = async () => {
    if (!deleting) return;
    try {
      const res = await mentorApi.remove(deleting._id);
      query.mutate((prev) => (prev || []).filter((x) => x._id !== deleting._id));
      toast.success(res.message);
      setDeleting(null);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Mentorlar"
        subtitle="Mentorlar yaratish, tahrirlash va nazorat qilish"
        actions={
          <Button onClick={openNew}>
            <HiOutlinePlus /> Mentor qo'shish
          </Button>
        }
      />
      <Card>
        {query.loading ? (
          <PageLoader />
        ) : query.error ? (
          <ErrorState message={query.error} onRetry={query.refetch} />
        ) : !query.data?.length ? (
          <EmptyState icon={<HiOutlineAcademicCap />} title="Mentorlar yo'q" action={<Button onClick={openNew}>Birinchi mentorni qo'shish</Button>} />
        ) : (
          <Table head={["Mentor", "Yo'nalish", "Navbatda", "Tekshirgan", "O'rtacha ball", "Holat", ""]}>
            {query.data.map((m) => (
              <tr key={m._id} className="hover:bg-mist">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={m.fullName} src={m.avatar} size={32} />
                    <span>
                      <span className="block font-semibold text-ink whitespace-nowrap">{m.fullName}</span>
                      <span className="block text-xs text-muted">
                        {m.phone} · TG {m.telegramId}
                      </span>
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-ink-2">{m.direction}</td>
                <td className="px-4 py-3 text-brand font-semibold">{m.stats.pending}</td>
                <td className="px-4 py-3 text-ink-2">
                  {m.stats.reviewed} <span className="text-muted text-xs">({m.stats.approved} qabul)</span>
                </td>
                <td className="px-4 py-3 text-ink-2">{m.stats.avgScore || "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1 items-start">
                    {m.status === "blocked" ? <Badge tone="danger">Bloklangan</Badge> : <Badge tone="success">Faol</Badge>}
                    {m.isAvailable === false && <Badge tone="warning">Band</Badge>}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1.5 justify-end">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(m)}>
                      Tahrirlash
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => toggleStatus(m)}>
                      {m.status === "blocked" ? "Faollashtirish" : "Bloklash"}
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => setDeleting(m)}>
                      O'chirish
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "Yangi mentor" : "Mentorni tahrirlash"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Bekor qilish
            </Button>
            <Button loading={saving} onClick={save}>
              Saqlash
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Ism va familiya" className="sm:col-span-2">
            <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          </Field>
          <Field label="Telefon" hint="+998XXXXXXXXX — kirish uchun">
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/[^\d+]/g, "") })} />
          </Field>
          <Field label="Telegram ID" hint="@devreadyrobot → /start">
            <Input value={form.telegramId} onChange={(e) => setForm({ ...form, telegramId: e.target.value.replace(/\D/g, "") })} />
          </Field>
          <Field label="Yo'nalish">
            <Select value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value })}>
              {TRACKS.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </Field>
          <Field label="Holat">
            <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="active">Faol</option>
              <option value="blocked">Bloklangan</option>
            </Select>
          </Field>
          <Field label="Bio (ixtiyoriy)" className="sm:col-span-2">
            <Textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={3} />
          </Field>
        </div>
      </Modal>

      <ConfirmModal
        open={!!deleting}
        danger
        title="Mentorni o'chirish"
        text={
          <>
            <b>{deleting?.fullName}</b> o'chiriladi. Uning tekshirilmagan ishlari ({deleting?.stats.pending || 0} ta) sizning navbatingizga o'tadi.
          </>
        }
        confirmLabel="O'chirish"
        onConfirm={remove}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
