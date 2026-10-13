import { useEffect, useState } from "react";
import { HiCheck } from "react-icons/hi";
import { HiOutlineClipboard, HiOutlineCloudArrowUp, HiOutlinePaperAirplane } from "react-icons/hi2";
import { errorMessage, paymentApi, planApi } from "../../api/api";
import { useCachedQuery, invalidateCache } from "../../hooks/useCachedQuery";
import { Alert, Badge, Button, Card, CardHeader, EmptyState, ErrorState, Modal, PageHeader, PageLoader, ProgressBar, Table, cx } from "../../components/ui";
import { useToast } from "../../components/ui/toast";
import { formatDate, formatPrice, limitLabel } from "../../lib/format";
import type { Plan } from "../../types/type";
import { isTopPlan, planAudience, planLines, pricePerTask } from "../../lib/plans";
import PlanCompare from "../../components/home/pricingHome/PlanCompare";

const PAY_STATUS = {
  pending: { label: "Tekshirilmoqda", tone: "warning" as const },
  approved: { label: "Tasdiqlangan", tone: "success" as const },
  rejected: { label: "Rad etilgan", tone: "danger" as const },
};

export default function Plans() {
  const mine = useCachedQuery("user:plan", planApi.mine, { staleTime: 10_000 });
  const info = useCachedQuery("user:paymentInfo", paymentApi.info, { staleTime: 10_000 });
  const history = useCachedQuery("user:payments", paymentApi.mine, { staleTime: 10_000 });
  const [selected, setSelected] = useState<Plan | null>(null);

  if (mine.loading || info.loading) return <PageLoader />;
  if (!mine.data || !info.data) return <ErrorState message={mine.error || info.error || "Xatolik"} onRetry={() => { mine.refetch(); info.refetch(); }} />;

  const my = mine.data;
  const paid = info.data.plans.filter((p) => p.price > 0);
  const pending = info.data.pendingPayment;

  const refresh = () => {
    invalidateCache("user:overview");
    mine.refetch();
    info.refetch();
    history.refetch();
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Tarif va to'lov" subtitle="Joriy tarifingiz, limitlar va tarifni yangilash" />

      <Card className="p-5 grid grid-cols-1 md:grid-cols-3 gap-5">
        <div>
          <p className="text-[13px] text-muted">Joriy tarif</p>
          <p className="text-2xl font-bold text-ink mt-1">{my.name}</p>
          <p className="text-xs text-muted mt-1">{my.expiresAt ? `${formatDate(my.expiresAt)} gacha amal qiladi` : my.isFree ? "Bepul tarif" : "Muddatsiz"}</p>
        </div>
        <div>
          <div className="flex justify-between text-xs text-muted mb-2">
            <span>Tasklar</span>
            <span className="text-ink font-semibold">
              {my.usedTasks} / {limitLabel(my.taskLimit)}
            </span>
          </div>
          {my.taskLimit !== -1 && <ProgressBar value={my.usedTasks} max={my.taskLimit} tone={my.remainingTasks === 0 ? "danger" : "success"} />}
        </div>
        <div>
          <div className="flex justify-between text-xs text-muted mb-2">
            <span>Mentor tekshiruvlari</span>
            <span className="text-ink font-semibold">
              {my.usedMentorReviews} / {limitLabel(my.mentorReviewsIncluded)}
            </span>
          </div>
          {my.mentorReviewsIncluded !== -1 && <ProgressBar value={my.usedMentorReviews} max={my.mentorReviewsIncluded || 1} tone="info" />}
        </div>
      </Card>

      {pending && (
        <Alert tone="warning">
          <b>{pending.plan?.name}</b> tarifi uchun to'lovingiz tekshirilmoqda ({formatPrice(pending.amount)}). Administrator tasdiqlagach tarif avtomatik faollashadi va sizga xabar keladi.
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {paid.map((p) => {
          const current = String(my._id) === String(p._id);
          return (
            <Card key={p._id} className={cx("p-6 flex flex-col gap-5", p.isPopular && "border-brand/40 ring-1 ring-brand/20")}>
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-lg font-bold text-ink">{p.name}</h3>
                <div className="flex gap-1.5">
                  {current && <Badge tone="info">Joriy</Badge>}
                  {p.isPopular ? <Badge tone="success">Tavsiya etiladi</Badge> : isTopPlan(p, paid) ? <Badge>Eng to'liq</Badge> : null}
                </div>
              </div>
              <p className="text-[13px] text-muted leading-relaxed -mt-2">{planAudience(p, info.data!.plans)}</p>
              <div>
                <span className="text-3xl font-extrabold text-ink">{formatPrice(p.price)}</span>
                <span className="text-xs text-muted"> / {p.duration} kun</span>
                <p className="text-[12px] text-muted mt-1">{pricePerTask(p) || "Task soni cheklanmagan"}</p>
              </div>
              <ul className="flex flex-col gap-2 text-sm flex-1">
                {planLines(p).map((f) => (
                  <li key={f.text} className={cx("flex gap-2", f.included ? "text-ink-2" : "text-muted/70 line-through decoration-line")}>
                    <HiCheck className={cx("mt-0.5 shrink-0", f.included ? "text-brand" : "text-line")} /> {f.text}
                  </li>
                ))}
              </ul>
              <Button variant={p.isPopular ? "primary" : "secondary"} disabled={!!pending} onClick={() => setSelected(p)}>
                {current ? "Muddatni uzaytirish" : `${p.name} tarifini tanlash`}
              </Button>
            </Card>
          );
        })}
        {paid.length === 0 && (
          <Card className="md:col-span-2 xl:col-span-3">
            <EmptyState title="Hozircha pullik tariflar yo'q" />
          </Card>
        )}
      </div>

      {info.data.plans.length > 1 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-bold text-ink">Tariflarni taqqoslash</h2>
          <PlanCompare plans={info.data.plans} currentId={String(my._id)} />
        </div>
      )}

      <Card>
        <CardHeader title="To'lovlar tarixi" />
        {!history.data?.length ? (
          <EmptyState title="To'lovlar yo'q" />
        ) : (
          <Table head={["Sana", "Tarif", "Summa", "Holat"]}>
            {history.data.map((p) => (
              <tr key={p._id}>
                <td className="px-4 py-3 text-ink-2 whitespace-nowrap">{formatDate(p.createdAt, true)}</td>
                <td className="px-4 py-3 text-ink">{typeof p.plan === "object" && p.plan ? p.plan.name : "—"}</td>
                <td className="px-4 py-3 text-ink-2 whitespace-nowrap">{formatPrice(p.amount)}</td>
                <td className="px-4 py-3">
                  <Badge tone={PAY_STATUS[p.status].tone}>{PAY_STATUS[p.status].label}</Badge>
                  {p.rejectReason && <p className="text-[11px] text-muted mt-1">{p.rejectReason}</p>}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <PaymentModal
        plan={selected}
        cardNumber={info.data.cardNumber}
        cardOwner={info.data.cardOwner}
        botUsername={info.data.botUsername}
        onClose={() => setSelected(null)}
        onDone={() => {
          setSelected(null);
          refresh();
        }}
      />
    </div>
  );
}

function PaymentModal({
  plan,
  cardNumber,
  cardOwner,
  botUsername,
  onClose,
  onDone,
}: {
  plan: Plan | null;
  cardNumber: string;
  cardOwner: string;
  botUsername: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!file) return setPreview("");
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!plan) setFile(null);
  }, [plan]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(cardNumber.replace(/\s/g, ""));
      toast.success("Karta raqami nusxalandi");
    } catch {
      toast.info(cardNumber);
    }
  };

  const send = async () => {
    if (!plan || !file) return toast.error("Chek rasmini yuklang");
    if (file.size > 5 * 1024 * 1024) return toast.error("Rasm hajmi 5MB dan oshmasligi kerak");
    setSending(true);
    try {
      await paymentApi.create(plan._id, file);
      toast.success("Chek yuborildi. Administrator tasdiqlashini kuting");
      onDone();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      open={!!plan}
      onClose={onClose}
      title={`${plan?.name || ""} tarifi uchun to'lov`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button onClick={send} loading={sending} disabled={!file}>
            <HiOutlinePaperAirplane /> Chekni yuborish
          </Button>
        </>
      }
    >
      {plan && (
        <div className="flex flex-col gap-5">
          <div className="rounded-2xl p-5 bg-linear-to-br from-brand-tint to-surface border border-brand/30">
            <p className="text-xs text-brand">To'lov summasi</p>
            <p className="text-2xl font-bold text-ink">{formatPrice(plan.price)}</p>
            <div className="mt-4 flex items-center justify-between gap-3">
              <div>
                <p className="font-mono text-lg tracking-wider text-ink">{cardNumber || "—"}</p>
                <p className="text-xs text-ink-2">{cardOwner}</p>
              </div>
              <Button variant="secondary" size="sm" onClick={copy}>
                <HiOutlineClipboard /> Nusxa
              </Button>
            </div>
          </div>

          <ol className="text-xs text-ink-2 list-decimal pl-5 space-y-1">
            <li>Yuqoridagi kartaga ko'rsatilgan summani o'tkazing (Click, Payme, bank ilovasi).</li>
            <li>To'lov chekining skrinshotini quyida yuklang.</li>
            <li>Administrator tekshirgach tarif avtomatik faollashadi.</li>
          </ol>

          <label className={cx("flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-5 cursor-pointer transition-colors", file ? "border-brand/30" : "border-line hover:border-ink-2")}>
            {preview ? (
              <img src={preview} alt="Chek" className="max-h-56 rounded-lg object-contain" />
            ) : (
              <>
                <HiOutlineCloudArrowUp size={32} className="text-muted" />
                <span className="text-sm text-ink-2">Chek rasmini tanlang</span>
                <span className="text-[11px] text-muted">JPG, PNG yoki WEBP · 5MB gacha</span>
              </>
            )}
            <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </label>

          <p className="text-[11px] text-muted text-center">
            Yoki chekni Telegram orqali yuboring:{" "}
            <a href={`https://t.me/${botUsername}`} target="_blank" rel="noreferrer" className="text-brand hover:underline">
              @{botUsername}
            </a>{" "}
            → /plans
          </p>
        </div>
      )}
    </Modal>
  );
}
