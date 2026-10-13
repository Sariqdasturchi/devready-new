import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { HiOutlineBanknotes, HiOutlineCheckBadge, HiOutlineClock, HiOutlineCreditCard, HiOutlineDocumentText, HiOutlineHandThumbDown, HiOutlineHandThumbUp } from "react-icons/hi2";
import { earningApi, errorMessage } from "../../api/api";
import type { EarningStatus, MentorEarning, MentorPayout } from "../../types/type";
import { useCachedQuery } from "../../hooks/useCachedQuery";
import { DIFFICULTY } from "../../lib/constants";
import { formatDate, formatPrice } from "../../lib/format";
import { Badge, Button, Card, EmptyState, ErrorState, Field, Input, Modal, PageHeader, PageLoader, ProgressBar, StatCard, Table, Tabs } from "../../components/ui";
import { useToast } from "../../components/ui/toast";
import ContractBanner from "../../components/payout/ContractBanner";
import ContractModal from "../../components/payout/ContractModal";

const STATUS: Record<EarningStatus, { label: string; tone: "warning" | "info" | "success" | "danger" }> = {
  pending: { label: "Kutish davrida", tone: "warning" },
  approved: { label: "Tasdiqlangan", tone: "info" },
  paid: { label: "To'langan", tone: "success" },
  void: { label: "Bekor qilingan", tone: "danger" },
};

const groupCard = (n: string) => n.replace(/\D/g, "").slice(0, 16).replace(/(\d{4})(?=\d)/g, "$1 ");

export default function MentorEarnings() {
  const q = useCachedQuery("mentor:earnings", earningApi.mine, { staleTime: 15_000 });
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState<"reviews" | "payouts">("reviews");
  const [cardOpen, setCardOpen] = useState(false);
  const [contractOpen, setContractOpen] = useState(params.get("contract") === "1");

  if (q.loading) return <PageLoader />;
  if (!q.data) return <ErrorState message={q.error || "Xatolik"} onRetry={q.refetch} />;
  const { summary, settings: s, card, items, payouts, contract } = q.data;
  const payable = summary.approved + summary.bonus.bonus;
  const nextDate = (() => {
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth(), s.payoutDay);
    if (d <= now) d.setMonth(d.getMonth() + 1);
    return d;
  })();

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Daromadim"
        subtitle="Har bir tekshiruv uchun hisoblangan summa, to'lovlar va qoidalar"
        actions={
          <Button variant="secondary" onClick={() => setContractOpen(true)}>
            <HiOutlineDocumentText size={17} /> Shartnoma{contract.accepted ? ` · v${contract.version}` : ""}
          </Button>
        }
      />
      <ContractBanner />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="Keyingi to'lovga" value={formatPrice(payable)} icon={<HiOutlineBanknotes />} tone="success" hint={summary.bonus.bonus ? `shundan bonus ${formatPrice(summary.bonus.bonus)}` : `${formatDate(nextDate.toISOString())} da`} />
        <StatCard label="Kutish davrida" value={formatPrice(summary.pending)} icon={<HiOutlineClock />} tone="warning" hint={`${s.holdDays} kundan keyin tasdiqlanadi`} />
        <StatCard label="Bu oy" value={formatPrice(summary.thisMonth)} icon={<HiOutlineCheckBadge />} tone="info" hint={`${summary.thisMonthCount} ta tekshiruv`} />
        <StatCard label="Jami to'langan" value={formatPrice(summary.paid)} tone="neutral" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="p-5 flex flex-col gap-3">
          <p className="text-sm font-bold text-ink">Keyingi to'lov</p>
          <p className="text-[13px] text-muted">
            Har oyning {s.payoutDay}-sanasida kartangizga. Minimal summa — {formatPrice(s.minPayout)}, kami keyingi oyga o'tadi.
          </p>
          <ProgressBar value={payable} max={s.minPayout} tone={payable >= s.minPayout ? "success" : "warning"} />
          <p className="text-[12px] text-muted">
            {payable >= s.minPayout ? "Minimal summa to'ldi" : `Yana ${formatPrice(s.minPayout - payable)} kerak`}
          </p>
          <div className="mt-1 rounded-xl bg-mist p-3 text-[13px] text-ink-2">
            Sifat bonusi: 👍 ulushi {s.bonusThresholdPct}% dan yuqori bo'lsa (kamida {s.bonusMinRatings} ta baho) +{s.bonusPct}%.
            <span className="block mt-1 font-semibold text-ink">
              Hozir: {summary.bonus.rated ? `${summary.bonus.share}% (${summary.bonus.rated} ta baho)` : "baholar yo'q"}
              {summary.bonus.eligible ? " — bonus beriladi" : ""}
            </span>
          </div>
        </Card>

        <Card className="p-5 flex flex-col gap-3">
          <p className="text-sm font-bold text-ink">Stavkalar</p>
          <ul className="flex flex-col divide-y divide-line">
            {(["oson", "orta", "qiyin"] as const).map((d) => (
              <li key={d} className="flex items-center justify-between py-2 text-sm">
                <span className={`px-2 py-0.5 rounded-md border text-[11px] font-semibold ${DIFFICULTY[d].className}`}>{DIFFICULTY[d].label}</span>
                <span className="font-semibold text-ink tabular-nums">{formatPrice(s.rates[d])}</span>
              </li>
            ))}
          </ul>
          <p className="text-[12px] text-muted leading-relaxed">
            {s.slaHours} soat ichida tekshirsangiz — to'liq stavka, kechiksa — {s.lateRatePct}%. Izoh kamida {s.minCommentLength} belgi. {s.reassignHours} soatdan keyin talaba
            yechimni boshqa mentorga o'tkazishi mumkin.
          </p>
        </Card>

        <Card className="p-5 flex flex-col gap-3">
          <p className="text-sm font-bold text-ink">To'lov kartasi</p>
          {card ? (
            <div className="rounded-xl bg-night text-white p-4">
              <HiOutlineCreditCard size={22} className="opacity-70" />
              <p className="font-mono text-[17px] tracking-wider mt-4">{card.masked}</p>
              <p className="text-[12px] opacity-70 mt-1">{card.holder}</p>
            </div>
          ) : (
            <p className="text-[13px] text-amber-800 bg-amber-50 rounded-xl p-3">Karta kiritilmagan — to'lovni o'tkazish uchun kartangizni qo'shing.</p>
          )}
          <Button variant="secondary" size="sm" onClick={() => setCardOpen(true)} className="self-start">
            {card ? "Kartani o'zgartirish" : "Karta qo'shish"}
          </Button>
        </Card>
      </div>

      <Card>
        <div className="p-4 sm:p-5 border-b border-line">
          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { value: "reviews", label: "Tekshiruvlar", count: items.length },
              { value: "payouts", label: "To'lovlar", count: payouts.length },
            ]}
          />
        </div>
        {tab === "reviews" ? <EarningsTable items={items} /> : <PayoutsTable payouts={payouts} />}
      </Card>

      <CardModal open={cardOpen} onClose={() => setCardOpen(false)} initial={card} onSaved={q.refetch} />
      <ContractModal
        open={contractOpen}
        onClose={() => {
          setContractOpen(false);
          if (params.get("contract")) setParams({}, { replace: true });
        }}
        onAccepted={q.refetch}
      />
    </div>
  );
}

function EarningsTable({ items }: { items: MentorEarning[] }) {
  if (!items.length) return <EmptyState title="Hali hisoblangan tekshiruv yo'q" text="Har bir baholangan yechim uchun summa shu yerda paydo bo'ladi." />;
  return (
    <Table head={["Sana", "Task", "Qiyinlik", "Muddat", "Summa", "Baho", "Holat"]}>
      {items.map((e) => {
        const st = STATUS[e.status];
        return (
          <tr key={e._id} className="align-top">
            <td className="px-4 py-3 whitespace-nowrap text-muted">{formatDate(e.reviewedAt, true)}</td>
            <td className="px-4 py-3 min-w-48">
              <p className="font-medium text-ink">{e.task?.title || "O'chirilgan task"}</p>
              <p className="text-[12px] text-muted">{e.student?.fullName}</p>
            </td>
            <td className="px-4 py-3">
              <span className={`px-2 py-0.5 rounded-md border text-[11px] font-semibold ${DIFFICULTY[e.difficulty]?.className || ""}`}>{DIFFICULTY[e.difficulty]?.label || e.difficulty}</span>
            </td>
            <td className="px-4 py-3 whitespace-nowrap">
              <span className={e.percent < 100 ? "text-amber-700" : "text-ink-2"}>{e.reviewHours} soat</span>
              {e.percent < 100 && <span className="block text-[11px] text-amber-700">kechikdi · {e.percent}%</span>}
            </td>
            <td className="px-4 py-3 whitespace-nowrap font-semibold text-ink tabular-nums">
              <span className={e.status === "void" ? "line-through text-muted" : ""}>{formatPrice(e.amount)}</span>
            </td>
            <td className="px-4 py-3">
              {e.rating === "up" ? <HiOutlineHandThumbUp className="text-emerald-600" size={18} aria-label="Ijobiy" /> : e.rating === "down" ? <HiOutlineHandThumbDown className="text-rose-600" size={18} aria-label="Salbiy" /> : <span className="text-muted">—</span>}
            </td>
            <td className="px-4 py-3">
              <Badge tone={e.complaintOpen ? "danger" : st.tone}>{e.complaintOpen ? "Shikoyat ko'rilmoqda" : st.label}</Badge>
              {e.status === "pending" && !e.complaintOpen && <span className="block text-[11px] text-muted mt-1">{formatDate(e.availableAt)} gacha</span>}
              {e.status === "void" && e.voidReason && <span className="block text-[11px] text-rose-600 mt-1 max-w-48">{e.voidReason}</span>}
            </td>
          </tr>
        );
      })}
    </Table>
  );
}

function PayoutsTable({ payouts }: { payouts: MentorPayout[] }) {
  const toast = useToast();
  const [receipt, setReceipt] = useState<string | null>(null);
  useEffect(() => () => void (receipt && URL.revokeObjectURL(receipt)), [receipt]);
  if (!payouts.length) return <EmptyState title="Hali to'lovlar bo'lmagan" text={`Tasdiqlangan summalar har oy kartangizga o'tkaziladi.`} />;
  return (
    <>
      <Table head={["Sana", "Tekshiruvlar", "Summa", "Bonus", "Jami", "Karta", ""]}>
        {payouts.map((p) => (
          <tr key={p._id}>
            <td className="px-4 py-3 whitespace-nowrap">{formatDate(p.paidAt, true)}</td>
            <td className="px-4 py-3">{p.reviews} ta</td>
            <td className="px-4 py-3 tabular-nums">{formatPrice(p.amount)}</td>
            <td className="px-4 py-3 tabular-nums">{p.bonus ? `+${formatPrice(p.bonus)}` : "—"}</td>
            <td className="px-4 py-3 font-semibold text-ink tabular-nums">{formatPrice(p.total)}</td>
            <td className="px-4 py-3 font-mono text-[12px] text-muted">{p.card?.number ? `•••• ${p.card.number.slice(-4)}` : "—"}</td>
            <td className="px-4 py-3">
              {p.receipt && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    earningApi
                      .myReceipt(p._id)
                      .then(setReceipt)
                      .catch((e) => toast.error(errorMessage(e)))
                  }
                >
                  Chek
                </Button>
              )}
            </td>
          </tr>
        ))}
      </Table>
      <Modal open={!!receipt} onClose={() => setReceipt(null)} title="To'lov cheki">
        {receipt && <img src={receipt} alt="To'lov cheki" className="w-full rounded-xl" />}
      </Modal>
    </>
  );
}

function CardModal({ open, onClose, initial, onSaved }: { open: boolean; onClose: () => void; initial: { number: string; holder: string } | null; onSaved: () => void }) {
  const toast = useToast();
  const [number, setNumber] = useState("");
  const [holder, setHolder] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (open) {
      setNumber(groupCard(initial?.number || ""));
      setHolder(initial?.holder || "");
    }
  }, [open, initial]);
  const save = async () => {
    setSaving(true);
    try {
      await earningApi.setCard({ number, holder });
      toast.success("Karta saqlandi");
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
      open={open}
      onClose={onClose}
      size="sm"
      title="To'lov kartasi"
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
        <Field label="Karta raqami" hint="UzCard, Humo, Visa yoki Mastercard — 16 ta raqam">
          <Input value={number} onChange={(e) => setNumber(groupCard(e.target.value))} inputMode="numeric" placeholder="8600 0000 0000 0000" className="font-mono tracking-wider" />
        </Field>
        <Field label="Karta egasi">
          <Input value={holder} onChange={(e) => setHolder(e.target.value.toUpperCase())} placeholder="ISM FAMILIYA" />
        </Field>
        <p className="text-[12px] text-muted">Karta raqamini faqat siz va administrator ko'radi.</p>
      </div>
    </Modal>
  );
}
