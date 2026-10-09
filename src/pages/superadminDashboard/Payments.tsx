import { useEffect, useState } from "react";
import { HiOutlineBanknotes } from "react-icons/hi2";
import { errorMessage, paymentApi } from "../../api/api";
import { useCachedQuery, invalidateCache } from "../../hooks/useCachedQuery";
import { Badge, Button, Card, EmptyState, ErrorState, Field, Input, Modal, PageHeader, PageLoader, StatCard, Table, Tabs } from "../../components/ui";
import { useToast } from "../../components/ui/toast";
import { formatDate, formatPrice } from "../../lib/format";
import type { Payment } from "../../types/type";

type Tab = "pending" | "approved" | "rejected" | "all";
const STATUS = {
  pending: { label: "Kutilmoqda", tone: "warning" as const },
  approved: { label: "Tasdiqlangan", tone: "success" as const },
  rejected: { label: "Rad etilgan", tone: "danger" as const },
};

export default function SuperadminPayments() {
  const [tab, setTab] = useState<Tab>("pending");
  const [open, setOpen] = useState<Payment | null>(null);
  const query = useCachedQuery(`admin:payments:${tab}`, () => paymentApi.all(tab === "all" ? undefined : tab), { staleTime: 10_000 });
  const stats = query.data?.stats;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="To'lovlar" subtitle="Cheklarni tekshirib tasdiqlang — tarif avtomatik faollashadi. Telegram botdagi tugmalar ham ishlaydi." />
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatCard label="Kutilmoqda" value={stats.pending} tone="warning" icon={<HiOutlineBanknotes />} />
          <StatCard label="Tasdiqlangan" value={stats.approved} tone="success" />
          <StatCard label="Jami daromad" value={formatPrice(stats.revenue)} tone="success" />
        </div>
      )}
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: "pending", label: "Kutilmoqda", count: stats?.pending },
          { value: "approved", label: "Tasdiqlangan" },
          { value: "rejected", label: "Rad etilgan" },
          { value: "all", label: "Barchasi" },
        ]}
      />
      <Card>
        {query.loading ? (
          <PageLoader />
        ) : query.error ? (
          <ErrorState message={query.error} onRetry={query.refetch} />
        ) : !query.data?.data.length ? (
          <EmptyState icon={<HiOutlineBanknotes />} title="To'lovlar yo'q" />
        ) : (
          <Table head={["Sana", "Foydalanuvchi", "Tarif", "Summa", "Manba", "Holat", ""]}>
            {query.data.data.map((p) => {
              const u = typeof p.user === "object" ? p.user : null;
              const plan = typeof p.plan === "object" ? p.plan : null;
              return (
                <tr key={p._id} className="hover:bg-mist">
                  <td className="px-4 py-3 text-ink-2 whitespace-nowrap">{formatDate(p.createdAt, true)}</td>
                  <td className="px-4 py-3">
                    <span className="block font-semibold text-ink whitespace-nowrap">{u?.fullName || "—"}</span>
                    <span className="block text-xs text-muted">{u?.phone}</span>
                  </td>
                  <td className="px-4 py-3 text-ink-2">{plan?.name || "—"}</td>
                  <td className="px-4 py-3 text-ink-2 whitespace-nowrap">{formatPrice(p.amount || plan?.price)}</td>
                  <td className="px-4 py-3 text-muted">{p.source === "telegram" ? "Bot" : "Sayt"}</td>
                  <td className="px-4 py-3">
                    <Badge tone={STATUS[p.status].tone}>{STATUS[p.status].label}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant={p.status === "pending" ? "primary" : "ghost"} onClick={() => setOpen(p)}>
                      {p.status === "pending" ? "Tekshirish" : "Ko'rish"}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </Table>
        )}
      </Card>
      <PaymentReview
        payment={open}
        onClose={() => setOpen(null)}
        onDone={() => {
          setOpen(null);
          invalidateCache("admin:payments:approved", "admin:payments:rejected", "admin:payments:all", "admin:stats");
          query.refetch();
        }}
      />
    </div>
  );
}

function PaymentReview({ payment, onClose, onDone }: { payment: Payment | null; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [img, setImg] = useState("");
  const [imgError, setImgError] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);

  useEffect(() => {
    if (!payment) return;
    let url = "";
    setImg("");
    setImgError(false);
    setReason("");
    paymentApi
      .checkImage(payment._id)
      .then((u) => {
        url = u;
        setImg(u);
      })
      .catch(() => setImgError(true));
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [payment]);

  if (!payment) return null;
  const u = typeof payment.user === "object" ? payment.user : null;
  const plan = typeof payment.plan === "object" ? payment.plan : null;

  const act = async (kind: "approve" | "reject") => {
    setBusy(kind);
    try {
      if (kind === "approve") await paymentApi.approve(payment._id);
      else await paymentApi.reject(payment._id, reason.trim());
      toast.success(kind === "approve" ? "Tasdiqlandi — tarif faollashtirildi" : "Rad etildi");
      onDone();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="To'lov cheki"
      size="lg"
      footer={
        payment.status === "pending" ? (
          <>
            <Button variant="danger" loading={busy === "reject"} disabled={!!busy} onClick={() => act("reject")}>
              Rad etish
            </Button>
            <Button loading={busy === "approve"} disabled={!!busy} onClick={() => act("approve")}>
              Tasdiqlash
            </Button>
          </>
        ) : (
          <Button variant="secondary" onClick={onClose}>
            Yopish
          </Button>
        )
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="rounded-xl border border-line bg-mist min-h-64 flex items-center justify-center overflow-hidden">
          {img ? (
            <a href={img} target="_blank" rel="noreferrer">
              <img src={img} alt="Chek" className="max-h-[60vh] object-contain" />
            </a>
          ) : imgError ? (
            <p className="text-xs text-rose-600 p-4 text-center">Chek rasmini yuklab bo'lmadi</p>
          ) : (
            <PageLoader label="Chek yuklanmoqda..." />
          )}
        </div>
        <div className="flex flex-col gap-3 text-sm">
          <Row label="Foydalanuvchi" value={u?.fullName} />
          <Row label="Telefon" value={u?.phone} />
          <Row label="Telegram ID" value={u?.telegramId || "—"} />
          <Row label="Tarif" value={plan ? `${plan.name} (${plan.duration} kun)` : "—"} />
          <Row label="Summa" value={formatPrice(payment.amount || plan?.price)} />
          <Row label="Sana" value={formatDate(payment.createdAt, true)} />
          <Row label="Manba" value={payment.source === "telegram" ? "Telegram bot" : "Sayt"} />
          {payment.status !== "pending" && <Row label="Holat" value={`${STATUS[payment.status].label}${payment.rejectReason ? ` — ${payment.rejectReason}` : ""}`} />}
          {payment.status === "pending" && (
            <Field label="Rad etish sababi (ixtiyoriy)" hint="Foydalanuvchiga yuboriladi">
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Masalan: summa to'liq emas" />
            </Field>
          )}
        </div>
      </div>
    </Modal>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between gap-3 border-b border-line pb-2">
      <span className="text-muted">{label}</span>
      <span className="text-ink font-medium text-right">{value || "—"}</span>
    </div>
  );
}
