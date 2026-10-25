import { useState } from "react";
import { Link } from "react-router-dom";
import { HiOutlineBuildingLibrary, HiOutlinePlus } from "react-icons/hi2";
import { errorMessage, orgApi, type OrgPayload } from "../../api/api";
import { useCachedQuery } from "../../hooks/useCachedQuery";
import { formatDate } from "../../lib/format";
import type { AdminOrg, OrgStatus } from "../../types/type";
import { Badge, Button, Card, EmptyState, ErrorState, Field, Input, Modal, PageHeader, PageLoader, ProgressBar, Select, Table, Textarea } from "../../components/ui";
import { useToast } from "../../components/ui/toast";

const STATUS: Record<OrgStatus, { label: string; tone: "info" | "success" | "danger" }> = {
  pilot: { label: "Pilot", tone: "info" },
  active: { label: "Faol", tone: "success" },
  suspended: { label: "To'xtatilgan", tone: "danger" },
};

const dateInput = (iso?: string) => (iso ? new Date(iso).toISOString().slice(0, 10) : "");
const plusDays = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

/** Superadmin: o'quv markazlari — yaratish, o'rinlar, muddat va holat */
export default function Orgs() {
  const q = useCachedQuery("admin:orgs", orgApi.adminList, { staleTime: 15_000 });
  const [editing, setEditing] = useState<AdminOrg | "new" | null>(null);

  if (q.loading) return <PageLoader />;
  if (q.error || !q.data) return <ErrorState message={q.error || "Yuklab bo'lmadi"} onRetry={q.refetch} />;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="O'quv markazlari"
        subtitle="Markaz yarating va egasini biriktiring. Ega o'qituvchilarni qo'shadi, o'qituvchilar guruh ochadi va topshiriq beradi."
        actions={
          <Button onClick={() => setEditing("new")}>
            <HiOutlinePlus size={18} /> Markaz qo'shish
          </Button>
        }
      />
      {!q.data.length ? (
        <Card>
          <EmptyState icon={<HiOutlineBuildingLibrary />} title="Hali markaz yo'q" text="Birinchi pilot markazni qo'shing: egasi devready.uz'da ro'yxatdan o'tgan bo'lishi kerak." />
        </Card>
      ) : (
        <Card className="overflow-hidden">
        <Table head={["Markaz", "Holat", "O'rinlar", "Faollik", "Egasi", ""]}>
          {q.data.map((o) => (
            <tr key={o.id} className="align-middle">
              <td className="px-4 py-3">
                <Link to={`/teach?org=${o.id}`} className="font-semibold text-ink hover:text-brand">
                  {o.name}
                </Link>
                <p className="text-xs text-muted">
                  {o.stats.groups} guruh · {o.members.filter((m) => m.role === "teacher").length} o'qituvchi
                </p>
              </td>
              <td className="px-4 py-3">
                <Badge tone={o.active ? STATUS[o.status].tone : "danger"}>{o.active ? STATUS[o.status].label : "Muddati o'tgan"}</Badge>
                <p className="text-xs text-muted mt-1">{formatDate(o.activeUntil)} gacha</p>
              </td>
              <td className="px-4 py-3 min-w-[130px]">
                <p className="text-sm tabular-nums text-ink">
                  {o.usedSeats} / {o.seats}
                </p>
                <ProgressBar value={o.usedSeats || 0} max={o.seats} tone={(o.usedSeats || 0) >= o.seats ? "danger" : "success"} />
              </td>
              <td className="px-4 py-3 text-sm text-ink-2 tabular-nums">
                {o.stats.weekSubmissions} yechim / 7 kun
                <p className="text-xs text-muted">jami {o.stats.submissions} · {o.stats.assignments} topshiriq</p>
              </td>
              <td className="px-4 py-3 text-sm">
                {o.members
                  .filter((m) => m.role === "owner")
                  .map((m) => (
                    <p key={m.userId} className="text-ink">
                      {m.name} <span className="text-muted">{m.phone}</span>
                    </p>
                  ))}
              </td>
              <td className="px-4 py-3 text-right">
                <Button size="sm" variant="outline" onClick={() => setEditing(o)}>
                  Tahrirlash
                </Button>
              </td>
            </tr>
          ))}
        </Table>
        </Card>
      )}
      {editing && <OrgModal org={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={q.refetch} />}
    </div>
  );
}

function OrgModal({ org, onClose, onSaved }: { org: AdminOrg | null; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [form, setForm] = useState({
    name: org?.name || "",
    ownerPhone: "",
    seats: String(org?.seats ?? 30),
    activeUntil: org ? dateInput(org.activeUntil) : plusDays(30),
    status: org?.status || "pilot",
    contactName: org?.contactName || "",
    contactPhone: org?.contactPhone || "",
    note: org?.note || "",
  });
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.name.trim()) return toast.error("Markaz nomini kiriting");
    if (!org && !form.ownerPhone.trim()) return toast.error("Ega telefonini kiriting");
    setSaving(true);
    try {
      const body: OrgPayload = {
        name: form.name.trim(),
        seats: Number(form.seats),
        // Tanlangan kun oxirigacha (Toshkent)
        activeUntil: new Date(`${form.activeUntil}T23:59:00+05:00`).toISOString(),
        status: form.status,
        contactName: form.contactName,
        contactPhone: form.contactPhone,
        note: form.note,
      };
      if (form.ownerPhone.trim()) body.ownerPhone = form.ownerPhone.trim();
      const r = org ? await orgApi.adminUpdate(org.id, body) : await orgApi.adminCreate(body);
      toast.success(r.message);
      onSaved();
      onClose();
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
      title={org ? org.name : "Yangi markaz"}
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
        <Field label="Markaz nomi">
          <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Masalan: Najot Ta'lim (Chilonzor)" />
        </Field>
        <Field label={org ? "Yana bir ega qo'shish (ixtiyoriy)" : "Markaz egasining telefoni"} hint="U avval devready.uz'da ro'yxatdan o'tgan bo'lishi kerak">
          <Input value={form.ownerPhone} onChange={(e) => set("ownerPhone", e.target.value)} placeholder="+998 90 123 45 67" inputMode="tel" />
        </Field>
        <div className="grid sm:grid-cols-3 gap-3">
          <Field label="O'rinlar">
            <Input type="number" min={1} value={form.seats} onChange={(e) => set("seats", e.target.value)} />
          </Field>
          <Field label="Amal qiladi">
            <Input type="date" value={form.activeUntil} onChange={(e) => set("activeUntil", e.target.value)} />
          </Field>
          <Field label="Holat">
            <Select value={form.status} onChange={(e) => set("status", e.target.value)}>
              <option value="pilot">Pilot (bepul)</option>
              <option value="active">Faol (to'langan)</option>
              <option value="suspended">To'xtatilgan</option>
            </Select>
          </Field>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Aloqa: ism">
            <Input value={form.contactName} onChange={(e) => set("contactName", e.target.value)} />
          </Field>
          <Field label="Aloqa: telefon">
            <Input value={form.contactPhone} onChange={(e) => set("contactPhone", e.target.value)} inputMode="tel" />
          </Field>
        </div>
        <Field label="Izoh (faqat superadmin ko'radi)">
          <Textarea rows={2} value={form.note} onChange={(e) => set("note", e.target.value)} placeholder="Shartnoma, narx, kelishuvlar..." />
        </Field>
      </div>
    </Modal>
  );
}
