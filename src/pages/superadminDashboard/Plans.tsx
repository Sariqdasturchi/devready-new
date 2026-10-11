import { useState } from "react";
import { HiOutlinePlus } from "react-icons/hi2";
import { errorMessage, planApi } from "../../api/api";
import { useCachedQuery } from "../../hooks/useCachedQuery";
import { Alert, Badge, Button, Card, ConfirmModal, EmptyState, ErrorState, Field, Input, Modal, PageHeader, PageLoader, Textarea, Toggle } from "../../components/ui";
import { useToast } from "../../components/ui/toast";
import { formatPrice, limitLabel } from "../../lib/format";
import type { Plan } from "../../types/type";

type Form = Omit<Plan, "_id" | "usersCount" | "features"> & { featuresText: string };
const EMPTY: Form = {
  name: "",
  price: 0,
  duration: 30,
  description: "",
  featuresText: "",
  active: true,
  isPopular: false,
  taskLimit: -1,
  mentorReviewsIncluded: -1,
  aiReviewEnabled: true,
};

export default function SuperadminPlans() {
  const toast = useToast();
  const query = useCachedQuery<Plan[]>("admin:plans", planApi.all, { staleTime: 15_000 });
  const [editing, setEditing] = useState<Plan | "new" | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Plan | null>(null);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  const openEdit = (p: Plan) => {
    setForm({ ...EMPTY, ...p, description: p.description || "", featuresText: (p.features || []).join("\n") });
    setEditing(p);
  };

  const save = async () => {
    if (!form.name.trim()) return toast.error("Tarif nomini kiriting");
    const { featuresText, ...rest } = form;
    const payload: Partial<Plan> = { ...rest, name: form.name.trim(), features: featuresText.split("\n").map((s) => s.trim()).filter(Boolean) };
    setSaving(true);
    try {
      if (editing === "new") await planApi.create(payload);
      else if (editing) await planApi.update(editing._id, payload);
      toast.success("Tarif saqlandi");
      setEditing(null);
      query.refetch();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!deleting) return;
    try {
      await planApi.remove(deleting._id);
      toast.success("Tarif o'chirildi");
      setDeleting(null);
      query.refetch();
    } catch (err) {
      toast.error(errorMessage(err));
      setDeleting(null);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Tariflar"
        subtitle="Narx, muddat va limitlar. -1 — cheksiz. Narxi 0 bo'lgan tarif Free hisoblanadi."
        actions={
          <Button
            onClick={() => {
              setForm(EMPTY);
              setEditing("new");
            }}
          >
            <HiOutlinePlus /> Tarif qo'shish
          </Button>
        }
      />
      {query.loading ? (
        <PageLoader />
      ) : query.error ? (
        <ErrorState message={query.error} onRetry={query.refetch} />
      ) : !query.data?.length ? (
        <Card>
          <EmptyState title="Tariflar yo'q" text="Free (0 so'm) va pullik tariflarni qo'shing" />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {query.data.map((p) => (
            <Card key={p._id} className="p-5 flex flex-col gap-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-lg font-bold text-ink">{p.name}</h3>
                  <p className="text-sm text-ink-2">
                    {p.price ? formatPrice(p.price) : "Bepul"} {p.duration ? `/ ${p.duration} kun` : ""}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {p.active ? <Badge tone="success">Faol</Badge> : <Badge tone="danger">Nofaol</Badge>}
                  {p.isPopular && <Badge tone="violet">Ommabop</Badge>}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-lg bg-mist p-2">
                  <p className="text-muted">Tasklar</p>
                  <p className="text-ink font-bold">{limitLabel(p.taskLimit)}</p>
                </div>
                <div className="rounded-lg bg-mist p-2">
                  <p className="text-muted">Mentor</p>
                  <p className="text-ink font-bold">{limitLabel(p.mentorReviewsIncluded)}</p>
                </div>
                <div className="rounded-lg bg-mist p-2">
                  <p className="text-muted">Foydalanuvchi</p>
                  <p className="text-ink font-bold">{p.price > 0 ? p.usersCount || 0 : "—"}</p>
                </div>
              </div>
              {p.description && <p className="text-xs text-muted">{p.description}</p>}
              <div className="flex gap-2 mt-auto">
                <Button size="sm" variant="secondary" onClick={() => openEdit(p)}>
                  Tahrirlash
                </Button>
                <Button size="sm" variant="danger" onClick={() => setDeleting(p)}>
                  O'chirish
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "Yangi tarif" : "Tarifni tahrirlash"}
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
          <Field label="Nomi" className="sm:col-span-2">
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Premium" />
          </Field>
          <Field label="Narx (so'm)" hint="0 — bepul (Free)">
            <Input type="number" min={0} value={form.price} onChange={(e) => set("price", Number(e.target.value))} />
          </Field>
          <Field label="Muddat (kun)" hint="0 — muddatsiz">
            <Input type="number" min={0} value={form.duration} onChange={(e) => set("duration", Number(e.target.value))} />
          </Field>
          <Field label="Task limiti" hint="-1 — cheksiz (faqat pullik tarifda). Tarif davri ichida hisoblanadi">
            <Input type="number" min={-1} value={form.taskLimit} onChange={(e) => set("taskLimit", Number(e.target.value))} />
          </Field>
          <Field label="Mentor tekshiruvlari" hint="-1 — cheksiz (faqat pullik tarifda)">
            <Input type="number" min={-1} value={form.mentorReviewsIncluded} onChange={(e) => set("mentorReviewsIncluded", Number(e.target.value))} />
          </Field>
          <Field label="Tavsif" className="sm:col-span-2">
            <Input value={form.description} onChange={(e) => set("description", e.target.value)} />
          </Field>
          <Field label="Afzalliklar (har biri yangi qatorda)" className="sm:col-span-2">
            <Textarea rows={4} value={form.featuresText} onChange={(e) => set("featuresText", e.target.value)} />
          </Field>
          <div className="sm:col-span-2 flex flex-wrap gap-6">
            <Toggle checked={form.active} onChange={(v) => set("active", v)} label="Faol" />
            <Toggle checked={!!form.isPopular} onChange={(v) => set("isPopular", v)} label="Ommabop" />
            <Toggle checked={form.aiReviewEnabled} onChange={(v) => set("aiReviewEnabled", v)} label="AI tekshiruv" />
          </div>
          {editing !== "new" && <Alert tone="info" className="sm:col-span-2">O'zgarishlar shu tarifdagi barcha foydalanuvchilarga darhol ta'sir qiladi.</Alert>}
        </div>
      </Modal>

      <ConfirmModal
        open={!!deleting}
        danger
        title="Tarifni o'chirish"
        text={<>Agar tarifdan foydalanuvchilar bo'lsa, o'chirib bo'lmaydi — uni nofaol qiling.</>}
        confirmLabel="O'chirish"
        onConfirm={remove}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
