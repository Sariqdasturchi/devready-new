import { useState } from "react";
import { HiOutlineLink, HiOutlinePlus, HiOutlineTicket } from "react-icons/hi2";
import { errorMessage, planApi, promoApi, type PromoPayload } from "../../api/api";
import type { Plan, PromoCode } from "../../types/type";
import { useCachedQuery, invalidateCache } from "../../hooks/useCachedQuery";
import { formatDate, formatPrice } from "../../lib/format";
import { promoLink } from "../../lib/promo";
import { Badge, Button, Card, ConfirmModal, EmptyState, ErrorState, Field, Input, Modal, PageHeader, PageLoader, Select, StatCard, Table, Textarea, Toggle, cx } from "../../components/ui";
import { useToast } from "../../components/ui/toast";

type Form = {
  code: string;
  description: string;
  discountType: "percent" | "fixed";
  value: number;
  plans: string[];
  maxUses: string;
  firstPurchaseOnly: boolean;
  validFrom: string;
  validUntil: string;
  active: boolean;
};

const EMPTY: Form = { code: "", description: "", discountType: "percent", value: 40, plans: [], maxUses: "100", firstPurchaseOnly: true, validFrom: "", validUntil: "", active: true };

const dateInput = (v: string | null) => (v ? new Date(v).toISOString().slice(0, 10) : "");
const discountLabel = (p: Pick<PromoCode, "discountType" | "value">) => (p.discountType === "percent" ? `${p.value}%` : formatPrice(p.value));

function status(p: PromoCode): { label: string; tone: "success" | "neutral" | "warning" | "danger" } {
  const now = Date.now();
  if (!p.active) return { label: "O'chirilgan", tone: "neutral" };
  if (p.validUntil && new Date(p.validUntil).getTime() + 86400000 < now) return { label: "Muddati tugagan", tone: "danger" };
  if (p.validFrom && new Date(p.validFrom).getTime() > now) return { label: "Hali boshlanmagan", tone: "warning" };
  if (p.maxUses && p.usage.approved + p.usage.pending >= p.maxUses) return { label: "Limit tugagan", tone: "danger" };
  return { label: "Faol", tone: "success" };
}

export default function SuperadminPromos() {
  const toast = useToast();
  const q = useCachedQuery("admin:promos", promoApi.list, { staleTime: 10_000 });
  const plans = useCachedQuery("admin:plans", planApi.all, { staleTime: 30_000 });
  const [editing, setEditing] = useState<PromoCode | "new" | null>(null);
  const [deleting, setDeleting] = useState<PromoCode | null>(null);

  if (q.loading) return <PageLoader />;
  if (!q.data) return <ErrorState message={q.error || "Xatolik"} onRetry={q.refetch} />;
  const all = q.data;
  const totals = all.reduce((a, p) => ({ uses: a.uses + p.usage.approved, revenue: a.revenue + p.usage.revenue, discount: a.discount + p.usage.discount }), { uses: 0, revenue: 0, discount: 0 });

  const copyLink = async (code: string) => {
    try {
      await navigator.clipboard.writeText(promoLink(code));
      toast.success("Havola nusxalandi — postga qo'ying");
    } catch {
      toast.info(promoLink(code));
    }
  };

  const toggle = async (p: PromoCode) => {
    try {
      await promoApi.update(p._id, { active: !p.active });
      q.refetch();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const remove = async () => {
    if (!deleting) return;
    try {
      const r = await promoApi.remove(deleting._id);
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
        title="Promokodlar"
        subtitle="Tariflarga chegirma: Telegram kanal, aksiya yoki hamkorlar uchun"
        actions={
          <Button onClick={() => setEditing("new")}>
            <HiOutlinePlus /> Promokod yaratish
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <StatCard label="Promokod bilan to'lovlar" value={totals.uses} icon={<HiOutlineTicket />} tone="success" />
        <StatCard label="Ular orqali tushum" value={formatPrice(totals.revenue)} tone="info" />
        <StatCard label="Berilgan chegirma" value={formatPrice(totals.discount)} tone="neutral" />
      </div>

      <Card>
        {all.length === 0 ? (
          <EmptyState
            icon={<HiOutlineTicket />}
            title="Hali promokod yo'q"
            text="Masalan, Telegram obunachilari uchun birinchi oyga 40% chegirma yarating."
            action={<Button onClick={() => setEditing("new")}>Promokod yaratish</Button>}
          />
        ) : (
          <Table head={["Kod", "Chegirma", "Tariflar", "Ishlatilgan", "Muddat", "Holat", ""]}>
            {all.map((p) => {
              const st = status(p);
              return (
                <tr key={p._id} className="align-middle">
                  <td className="px-4 py-3">
                    <p className="font-mono font-semibold text-ink">{p.code}</p>
                    {p.description && <p className="text-[12px] text-muted max-w-56 truncate">{p.description}</p>}
                  </td>
                  <td className="px-4 py-3 font-semibold text-ink whitespace-nowrap">
                    −{discountLabel(p)}
                    {p.firstPurchaseOnly && <span className="block text-[11px] font-normal text-muted">faqat birinchi xarid</span>}
                  </td>
                  <td className="px-4 py-3 text-ink-2">{p.plans.length ? p.plans.map((x) => x.name).join(", ") : "Barchasi"}</td>
                  <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                    {p.usage.approved}
                    {p.maxUses ? ` / ${p.maxUses}` : ""}
                    {p.usage.pending > 0 && <span className="block text-[11px] text-amber-700">+{p.usage.pending} tekshirilmoqda</span>}
                  </td>
                  <td className="px-4 py-3 text-[13px] text-muted whitespace-nowrap">
                    {p.validFrom || p.validUntil ? `${p.validFrom ? formatDate(p.validFrom) : "…"} — ${p.validUntil ? formatDate(p.validUntil) : "…"}` : "Muddatsiz"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={st.tone}>{st.label}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <Button size="sm" variant="ghost" onClick={() => copyLink(p.code)} title="Havolani nusxalash">
                        <HiOutlineLink /> Havola
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditing(p)}>
                        Tahrirlash
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => toggle(p)}>
                        {p.active ? "O'chirish" : "Yoqish"}
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => setDeleting(p)}>
                        Yo'q qilish
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </Table>
        )}
      </Card>

      <PromoModal
        promo={editing}
        plans={(plans.data || []).filter((p) => p.price > 0)}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          q.refetch();
          invalidateCache("admin:payments");
        }}
      />
      <ConfirmModal
        open={!!deleting}
        danger
        title="Promokodni yo'q qilish"
        text={
          deleting?.usage.approved || deleting?.usage.pending ? (
            <>
              <b>{deleting?.code}</b> ishlatilgan — statistika saqlanib qolishi uchun u yo'q qilinmaydi, faqat o'chiriladi.
            </>
          ) : (
            <>
              <b>{deleting?.code}</b> butunlay o'chiriladi.
            </>
          )
        }
        confirmLabel="Davom etish"
        onConfirm={remove}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}

function PromoModal({ promo, plans, onClose, onSaved }: { promo: PromoCode | "new" | null; plans: Plan[]; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [form, setForm] = useState<Form>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [openedFor, setOpenedFor] = useState<PromoCode | "new" | null>(null);

  // Modal ochilganda forma to'ldiriladi
  if (promo !== openedFor) {
    setOpenedFor(promo);
    if (promo && promo !== "new") {
      setForm({
        code: promo.code,
        description: promo.description || "",
        discountType: promo.discountType,
        value: promo.value,
        plans: promo.plans.map((p) => p._id),
        maxUses: promo.maxUses ? String(promo.maxUses) : "",
        firstPurchaseOnly: promo.firstPurchaseOnly,
        validFrom: dateInput(promo.validFrom),
        validUntil: dateInput(promo.validUntil),
        active: promo.active,
      });
    } else if (promo === "new") setForm(EMPTY);
  }
  if (!promo) return null;
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const used = promo !== "new" && promo.usage.approved + promo.usage.pending > 0;

  const preview = plans
    .filter((p) => !form.plans.length || form.plans.includes(p._id))
    .map((p) => {
      const d = form.discountType === "percent" ? (p.price * Math.min(100, form.value || 0)) / 100 : form.value || 0;
      return { name: p.name, price: p.price, amount: Math.max(0, Math.round((p.price - d) / 100) * 100) };
    });

  const save = async () => {
    const body: PromoPayload = {
      code: form.code.trim().toUpperCase(),
      description: form.description.trim(),
      discountType: form.discountType,
      value: Number(form.value),
      plans: form.plans,
      maxUses: form.maxUses.trim() ? Number(form.maxUses) : null,
      firstPurchaseOnly: form.firstPurchaseOnly,
      validFrom: form.validFrom ? new Date(`${form.validFrom}T00:00:00`).toISOString() : null,
      validUntil: form.validUntil ? new Date(`${form.validUntil}T23:59:59`).toISOString() : null,
      active: form.active,
    };
    setSaving(true);
    try {
      if (promo === "new") await promoApi.create(body);
      else await promoApi.update(promo._id, body);
      toast.success(promo === "new" ? "Promokod yaratildi" : "Saqlandi");
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
      size="lg"
      title={promo === "new" ? "Yangi promokod" : `${promo.code} — tahrirlash`}
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
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Kod" hint={used ? "Ishlatilgan kodning nomi o'zgarmaydi" : "Lotin harflari, raqam, '-' yoki '_'"}>
          <Input value={form.code} onChange={(e) => set("code", e.target.value.toUpperCase().replace(/\s/g, ""))} placeholder="KANAL40" disabled={used} className="font-mono uppercase" />
        </Field>
        <Field label="Chegirma">
          <div className="flex gap-2">
            <Select value={form.discountType} onChange={(e) => set("discountType", e.target.value as Form["discountType"])} className="w-28 shrink-0">
              <option value="percent">Foiz</option>
              <option value="fixed">So'm</option>
            </Select>
            <Input type="number" min={1} max={form.discountType === "percent" ? 100 : undefined} value={form.value} onChange={(e) => set("value", Number(e.target.value))} className="flex-1 min-w-0" />
          </div>
        </Field>
        <Field label="Izoh (ixtiyoriy)" hint="To'lov oynasida talabaga ko'rinadi" className="sm:col-span-2">
          <Textarea rows={2} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Telegram kanal obunachilari uchun birinchi oy" className="min-h-[60px]" />
        </Field>
        <div className="sm:col-span-2 flex flex-col gap-2">
          <span className="text-xs font-semibold text-ink-2">Qaysi tariflar uchun</span>
          <div className="flex flex-wrap gap-2">
            {plans.map((p) => {
              const on = form.plans.includes(p._id);
              return (
                <button
                  key={p._id}
                  type="button"
                  onClick={() => set("plans", on ? form.plans.filter((x) => x !== p._id) : [...form.plans, p._id])}
                  aria-pressed={on}
                  className={cx("h-9 px-3.5 rounded-full border text-sm cursor-pointer", on ? "border-brand bg-brand-tint text-brand font-semibold" : "border-line text-ink-2 hover:border-ink-2")}
                >
                  {p.name} · {formatPrice(p.price)}
                </button>
              );
            })}
          </div>
          <p className="text-[12px] text-muted">{form.plans.length ? "Faqat tanlangan tariflarga ishlaydi" : "Hech biri tanlanmasa — barcha pullik tariflarga"}</p>
        </div>
        <Field label="Necha marta ishlatish mumkin" hint="Bo'sh — cheklanmagan. Har bir odam bir marta ishlatadi">
          <Input type="number" min={1} value={form.maxUses} onChange={(e) => set("maxUses", e.target.value)} placeholder="Cheklanmagan" />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Boshlanishi">
            <Input type="date" value={form.validFrom} onChange={(e) => set("validFrom", e.target.value)} />
          </Field>
          <Field label="Tugashi">
            <Input type="date" value={form.validUntil} onChange={(e) => set("validUntil", e.target.value)} />
          </Field>
        </div>
        <div className="sm:col-span-2 flex flex-wrap gap-6">
          <Toggle checked={form.firstPurchaseOnly} onChange={(v) => set("firstPurchaseOnly", v)} label="Faqat birinchi marta to'layotganlar uchun" />
          <Toggle checked={form.active} onChange={(v) => set("active", v)} label="Faol" />
        </div>
        {preview.length > 0 && form.value > 0 && (
          <div className="sm:col-span-2 rounded-xl bg-mist p-3.5 text-sm flex flex-col gap-1.5">
            <p className="text-xs font-semibold text-ink-2">Talaba to'laydi</p>
            {preview.map((p) => (
              <p key={p.name} className="flex justify-between gap-3">
                <span className="text-ink-2">{p.name}</span>
                <span className="tabular-nums">
                  <span className="text-muted line-through mr-2">{formatPrice(p.price)}</span>
                  <b className="text-ink">{p.amount ? formatPrice(p.amount) : "Bepul"}</b>
                </span>
              </p>
            ))}
            {preview.some((p) => p.amount === 0) && <p className="text-[12px] text-amber-800">100% chegirmada tarif chek talab qilinmasdan darhol faollashadi.</p>}
          </div>
        )}
      </div>
    </Modal>
  );
}
