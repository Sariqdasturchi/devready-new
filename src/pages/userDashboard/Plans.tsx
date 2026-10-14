import { useEffect, useState } from "react";
import { HiCheck } from "react-icons/hi";
import { HiOutlineClipboard, HiOutlineCloudArrowUp, HiOutlinePaperAirplane, HiOutlineTicket, HiOutlineXMark } from "react-icons/hi2";
import { errorMessage, paymentApi, planApi } from "../../api/api";
import { useCachedQuery, invalidateCache } from "../../hooks/useCachedQuery";
import { Alert, Badge, Button, Card, CardHeader, EmptyState, ErrorState, Modal, PageHeader, PageLoader, ProgressBar, Table, cx } from "../../components/ui";
import { useToast } from "../../components/ui/toast";
import { formatDate, formatPrice, limitLabel } from "../../lib/format";
import type { Plan, PromoCheck } from "../../types/type";
import { clearStoredPromo, getStoredPromo } from "../../lib/promo";
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
  const [storedPromo] = useState(getStoredPromo);

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

      {storedPromo && !pending && (
        <Alert tone="info">
          <span className="inline-flex items-center gap-2">
            <HiOutlineTicket size={18} className="shrink-0" />
            <span>
              <b>{storedPromo}</b> promokodi saqlangan — tarifni tanlang, chegirma to'lov oynasida avtomatik qo'llanadi.
            </span>
          </span>
        </Alert>
      )}

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
                <td className="px-4 py-3 text-ink-2 whitespace-nowrap">
                  {formatPrice(p.amount)}
                  {p.promoCodeText && <span className="block text-[11px] text-emerald-700">{p.promoCodeText} · −{formatPrice(p.discount)}</span>}
                </td>
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
  const [code, setCode] = useState(() => getStoredPromo() || "");
  const [promo, setPromo] = useState<PromoCheck | null>(null);
  const [promoError, setPromoError] = useState("");
  const [checking, setChecking] = useState(false);

  const applyPromo = async (value = code, silent = false) => {
    if (!plan || !value.trim()) return;
    setChecking(true);
    setPromoError("");
    try {
      const r = await paymentApi.checkPromo(value.trim(), plan._id);
      setPromo(r);
      if (!silent) toast.success(`Promokod qo'llandi: −${formatPrice(r.discount)}`);
    } catch (err) {
      setPromo(null);
      setPromoError(errorMessage(err));
    } finally {
      setChecking(false);
    }
  };

  // Tarif ochilganda saqlangan kod avtomatik tekshiriladi
  useEffect(() => {
    setPromo(null);
    setPromoError("");
    const saved = getStoredPromo();
    if (plan && saved) {
      setCode(saved);
      applyPromo(saved, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan?._id]);

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

  const amount = promo ? promo.amount : plan?.price || 0;
  const free = !!promo && amount === 0;

  const send = async () => {
    if (!plan) return;
    if (!free && !file) return toast.error("Chek rasmini yuklang");
    if (file && file.size > 5 * 1024 * 1024) return toast.error("Rasm hajmi 5MB dan oshmasligi kerak");
    setSending(true);
    try {
      const r = await paymentApi.create(plan._id, free ? null : file, promo?.code);
      if (promo) clearStoredPromo();
      toast.success(r.message);
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
          <Button onClick={send} loading={sending} disabled={!free && !file}>
            <HiOutlinePaperAirplane /> {free ? "Tarifni faollashtirish" : "Chekni yuborish"}
          </Button>
        </>
      }
    >
      {plan && (
        <div className="flex flex-col gap-5">
          <div className="rounded-2xl p-5 bg-linear-to-br from-brand-tint to-surface border border-brand/30">
            <p className="text-xs text-brand">To'lov summasi</p>
            <p className="flex items-baseline gap-2 flex-wrap">
              <span className="text-2xl font-bold text-ink">{formatPrice(amount)}</span>
              {promo && <span className="text-sm text-muted line-through">{formatPrice(plan.price)}</span>}
            </p>
            {promo && (
              <p className="mt-1 text-xs font-semibold text-emerald-700">
                {promo.code} promokodi: −{formatPrice(promo.discount)}
                {promo.description ? ` · ${promo.description}` : ""}
              </p>
            )}
            {!free && (
              <div className="mt-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-lg tracking-wider text-ink">{cardNumber || "—"}</p>
                  <p className="text-xs text-ink-2">{cardOwner}</p>
                </div>
                <Button variant="secondary" size="sm" onClick={copy}>
                  <HiOutlineClipboard /> Nusxa
                </Button>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-ink-2">Promokod</span>
            {promo ? (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5">
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800">
                  <HiOutlineTicket size={17} /> {promo.code}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setPromo(null);
                    setCode("");
                    clearStoredPromo();
                  }}
                  className="p-1 rounded-full text-emerald-800 hover:bg-emerald-100 cursor-pointer"
                  aria-label="Promokodni olib tashlash"
                >
                  <HiOutlineXMark size={16} />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.toUpperCase());
                    setPromoError("");
                  }}
                  onKeyDown={(e) => e.key === "Enter" && applyPromo()}
                  placeholder="Masalan: KANAL40"
                  className="flex-1 min-w-0 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[15px] text-ink uppercase placeholder:normal-case placeholder:text-muted/70 focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10"
                  aria-label="Promokod"
                />
                <Button variant="secondary" onClick={() => applyPromo()} loading={checking} disabled={!code.trim()}>
                  Qo'llash
                </Button>
              </div>
            )}
            {promoError && <p className="text-xs text-rose-600">{promoError}</p>}
          </div>

          {free ? (
            <Alert tone="success">Promokod tarif narxini to'liq qoplaydi — chek kerak emas. "Tarifni faollashtirish" tugmasini bosing.</Alert>
          ) : (
            <>
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
            </>
          )}

          {!promo && (
            <p className="text-[11px] text-muted text-center">
              Yoki chekni Telegram orqali yuboring:{" "}
              <a href={`https://t.me/${botUsername}`} target="_blank" rel="noreferrer" className="text-brand hover:underline">
                @{botUsername}
              </a>{" "}
              → /plans
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}
