import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { HiOutlineBanknotes, HiOutlineClipboardDocument, HiOutlineClock, HiOutlineExclamationTriangle } from "react-icons/hi2";
import { errorCode, errorMessage, payoutApi } from "../../api/api";
import type { ComplaintItem, MentorPayout, PayoutSettings, PayoutSummaryRow } from "../../types/type";
import { useCachedQuery, invalidateCache } from "../../hooks/useCachedQuery";
import { DIFFICULTY } from "../../lib/constants";
import { formatDate, formatPrice } from "../../lib/format";
import { Alert, Avatar, Badge, Button, Card, EmptyState, ErrorState, Field, Input, Modal, PageHeader, PageLoader, StatCard, Table, Tabs, Textarea, Toggle } from "../../components/ui";
import { useToast } from "../../components/ui/toast";

type Tab = "pay" | "complaints" | "history" | "settings" | "contract";

export default function SuperadminPayouts() {
  const [params, setParams] = useSearchParams();
  const tab = (params.get("tab") as Tab) || "pay";
  const complaints = useCachedQuery("admin:complaints", () => payoutApi.complaints("open"), { staleTime: 15_000 });

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Mentor to'lovlari" subtitle="Tekshiruvlar uchun hisob-kitob, shikoyatlar, stavkalar va shartnoma" />
      <Tabs
        value={tab}
        onChange={(v) => setParams(v === "pay" ? {} : { tab: v }, { replace: true })}
        items={[
          { value: "pay", label: "To'lanadi" },
          { value: "complaints", label: "Shikoyatlar", count: complaints.data?.length || undefined },
          { value: "history", label: "Tarix" },
          { value: "settings", label: "Stavkalar va qoidalar" },
          { value: "contract", label: "Shartnoma" },
        ]}
      />
      {tab === "pay" && <PayTab />}
      {tab === "complaints" && <ComplaintsTab onChanged={complaints.refetch} />}
      {tab === "history" && <HistoryTab />}
      {tab === "settings" && <SettingsTab />}
      {tab === "contract" && <ContractTab />}
    </div>
  );
}

// ── To'lanadi ──────────────────────────────────────────────────

function PayTab() {
  const q = useCachedQuery("admin:payouts", payoutApi.summary, { staleTime: 10_000 });
  const [paying, setPaying] = useState<PayoutSummaryRow | null>(null);
  if (q.loading) return <PageLoader />;
  if (!q.data) return <ErrorState message={q.error || "Xatolik"} onRetry={q.refetch} />;
  const { rows, totals, settings } = q.data;
  const unsigned = rows.filter((r) => !r.contract.accepted && r.mentor.status !== "blocked").length;

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <StatCard label="To'lanadi" value={formatPrice(totals.payable)} icon={<HiOutlineBanknotes />} tone="success" hint={`Har oyning ${settings.payoutDay}-sanasida`} />
        <StatCard label="Kutish davrida" value={formatPrice(totals.pending)} icon={<HiOutlineClock />} tone="warning" hint={`${settings.holdDays} kunlik shikoyat muddati`} />
        <StatCard label="Jami to'langan" value={formatPrice(totals.paid)} tone="neutral" />
      </div>
      {unsigned > 0 && <Alert tone="warning">{unsigned} ta mentor shartnomaning joriy versiyasini tasdiqlamagan — ular yangi yechimlarni tekshira olmaydi.</Alert>}
      <Card>
        {rows.length === 0 ? (
          <EmptyState title="Mentorlar yo'q" />
        ) : (
          <Table head={["Mentor", "Karta", "Shartnoma", "Kutishda", "Tasdiqlangan", "Bonus", "To'lanadi", ""]}>
            {rows.map((r) => (
              <tr key={r.mentor._id} className="align-middle">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5 min-w-44">
                    <Avatar name={r.mentor.fullName} src={r.mentor.avatar} size={34} />
                    <div className="min-w-0">
                      <p className="font-medium text-ink truncate">{r.mentor.fullName}</p>
                      <p className="text-[12px] text-muted">{r.mentor.direction}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">{r.card ? <CardNumber number={r.card.number} holder={r.card.holder} /> : <span className="text-amber-700 text-[13px]">kiritilmagan</span>}</td>
                <td className="px-4 py-3">
                  {r.contract.accepted ? <Badge tone="success">v{r.contract.version}</Badge> : <Badge tone="warning">{r.contract.version ? `v${r.contract.version} — eskirgan` : "tasdiqlanmagan"}</Badge>}
                </td>
                <td className="px-4 py-3 tabular-nums text-muted whitespace-nowrap">{formatPrice(r.pending)}</td>
                <td className="px-4 py-3 tabular-nums whitespace-nowrap">
                  {formatPrice(r.approved)}
                  <span className="block text-[11px] text-muted">{r.approvedCount} ta tekshiruv</span>
                </td>
                <td className="px-4 py-3 tabular-nums whitespace-nowrap">
                  {r.bonus.bonus ? `+${formatPrice(r.bonus.bonus)}` : "—"}
                  {r.bonus.rated > 0 && <span className="block text-[11px] text-muted">👍 {r.bonus.share}% · {r.bonus.rated} ta</span>}
                </td>
                <td className="px-4 py-3 font-semibold text-ink tabular-nums whitespace-nowrap">{formatPrice(r.payable)}</td>
                <td className="px-4 py-3 text-right">
                  <Button size="sm" disabled={!r.payable} variant={r.payable >= settings.minPayout ? "primary" : "secondary"} onClick={() => setPaying(r)}>
                    To'lash
                  </Button>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      <PayModal
        row={paying}
        minPayout={settings.minPayout}
        onClose={() => setPaying(null)}
        onPaid={() => {
          setPaying(null);
          q.refetch();
          invalidateCache("admin:payout-history");
        }}
      />
    </>
  );
}

function CardNumber({ number, holder }: { number: string; holder: string }) {
  const toast = useToast();
  const grouped = number.replace(/(\d{4})(?=\d)/g, "$1 ");
  return (
    <button
      type="button"
      onClick={() => navigator.clipboard?.writeText(number).then(() => toast.success("Karta raqami nusxalandi"))}
      className="text-left group cursor-pointer"
      title="Nusxalash"
    >
      <span className="font-mono text-[13px] text-ink inline-flex items-center gap-1.5 whitespace-nowrap">
        {grouped} <HiOutlineClipboardDocument className="text-muted group-hover:text-brand" />
      </span>
      <span className="block text-[11px] text-muted">{holder}</span>
    </button>
  );
}

function PayModal({ row, minPayout, onClose, onPaid }: { row: PayoutSummaryRow | null; minPayout: number; onClose: () => void; onPaid: () => void }) {
  const toast = useToast();
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [force, setForce] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (row) {
      setNote("");
      setFile(null);
      setForce(row.payable < minPayout);
    }
  }, [row, minPayout]);
  if (!row) return null;
  const below = row.payable < minPayout;
  const pay = async () => {
    setSaving(true);
    try {
      const r = await payoutApi.pay(row.mentor._id, { note, receipt: file, force });
      toast.success(r.message);
      onPaid();
    } catch (e) {
      toast.error(errorCode(e) === "BELOW_MIN" ? "Summa minimaldan kam — “baribir to'lash” belgisini qo'ying" : errorMessage(e));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal
      open
      onClose={onClose}
      title={`${row.mentor.fullName} — to'lov`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button onClick={pay} loading={saving} disabled={below && !force}>
            {formatPrice(row.payable)} to'landi deb belgilash
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="rounded-xl bg-mist p-4 text-sm flex flex-col gap-1.5">
          <Line label={`${row.approvedCount} ta tekshiruv`} value={formatPrice(row.approved)} />
          <Line label={`Sifat bonusi${row.bonus.rated ? ` (👍 ${row.bonus.share}%)` : ""}`} value={row.bonus.bonus ? `+${formatPrice(row.bonus.bonus)}` : "—"} />
          <div className="border-t border-line pt-1.5">
            <Line label="Jami" value={formatPrice(row.payable)} strong />
          </div>
        </div>
        {row.card ? (
          <div className="rounded-xl border border-line p-3">
            <p className="text-[12px] text-muted mb-1">Shu kartaga o'tkazing</p>
            <CardNumber number={row.card.number} holder={row.card.holder} />
          </div>
        ) : (
          <Alert tone="warning">Mentor karta kiritmagan. Pulni boshqa yo'l bilan o'tkazgan bo'lsangiz, izohda yozing.</Alert>
        )}
        {below && (
          <label className="flex items-start gap-2.5 text-sm text-ink cursor-pointer">
            <input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} className="mt-0.5 w-4 h-4 accent-brand" />
            Summa minimal {formatPrice(minPayout)} dan kam — baribir to'lash
          </label>
        )}
        <Field label="Chek (ixtiyoriy)" hint="Mentor kabinetida ko'rinadi">
          <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} className="text-sm file:mr-3 file:rounded-full file:border-0 file:bg-mist file:px-3 file:py-1.5 file:text-ink" />
        </Field>
        <Field label="Izoh (ixtiyoriy)">
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Masalan: Oktyabr oyi uchun" />
        </Field>
        <p className="text-[12px] text-muted">Tugmani pulni o'tkazgandan keyin bosing — mentorga Telegram orqali xabar boradi.</p>
      </div>
    </Modal>
  );
}

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={strong ? "font-semibold text-ink" : "text-ink-2"}>{label}</span>
      <span className={strong ? "font-bold text-ink tabular-nums" : "tabular-nums text-ink"}>{value}</span>
    </div>
  );
}

// ── Shikoyatlar ────────────────────────────────────────────────

function ComplaintsTab({ onChanged }: { onChanged: () => void }) {
  const [status, setStatus] = useState<"open" | "all">("open");
  const q = useCachedQuery(`admin:complaints:${status}`, () => payoutApi.complaints(status), { staleTime: 5_000 });
  const [active, setActive] = useState<ComplaintItem | null>(null);
  return (
    <>
      <Tabs
        value={status}
        onChange={setStatus}
        items={[
          { value: "open", label: "Ko'rilmagan" },
          { value: "all", label: "Barchasi" },
        ]}
      />
      {q.loading ? (
        <PageLoader />
      ) : !q.data ? (
        <ErrorState message={q.error || "Xatolik"} onRetry={q.refetch} />
      ) : q.data.length === 0 ? (
        <Card>
          <EmptyState title="Shikoyatlar yo'q" text="Talabalar mentor tekshiruvidan norozi bo'lsa, shu yerda ko'rinadi." />
        </Card>
      ) : (
        <div className="grid gap-3">
          {q.data.map((c) => {
            const cmp = c.studentFeedback.complaint!;
            const student = typeof c.userId === "object" ? c.userId : null;
            const mentor = typeof c.reviewedBy === "object" ? c.reviewedBy : null;
            const task = typeof c.taskId === "object" ? c.taskId : null;
            return (
              <Card key={c._id} className="p-4 sm:p-5 flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <HiOutlineExclamationTriangle className="text-amber-600" size={18} />
                  <p className="text-sm font-semibold text-ink">{task?.title}</p>
                  <Badge tone={cmp.status === "open" ? "warning" : cmp.status === "accepted" ? "danger" : "neutral"}>
                    {cmp.status === "open" ? "Ko'rilmagan" : cmp.status === "accepted" ? "Qabul qilingan" : "Rad etilgan"}
                  </Badge>
                  <span className="text-[12px] text-muted ml-auto">{formatDate(cmp.createdAt, true)}</span>
                </div>
                <p className="text-[13px] text-muted">
                  Talaba: <b className="text-ink-2">{student?.fullName}</b> · Mentor: <b className="text-ink-2">{mentor?.fullName}</b> · Baho: {c.mentorFeedback?.score}/100
                  {c.earning ? ` · ${formatPrice(c.earning.amount)}` : ""}
                </p>
                <p className="text-sm text-ink whitespace-pre-line rounded-xl bg-amber-50 p-3">{cmp.text}</p>
                {cmp.resolution && <p className="text-[13px] text-muted">Qaror: {cmp.resolution}</p>}
                {cmp.status === "open" && (
                  <Button size="sm" className="self-start" onClick={() => setActive(c)}>
                    Ko'rib chiqish
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
      )}
      <ResolveModal
        item={active}
        onClose={() => setActive(null)}
        onDone={() => {
          setActive(null);
          q.refetch();
          onChanged();
          invalidateCache("admin:payouts");
        }}
      />
    </>
  );
}

function ResolveModal({ item, onClose, onDone }: { item: ComplaintItem | null; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<"" | "accept" | "reject">("");
  useEffect(() => setNote(""), [item]);
  if (!item) return null;
  const go = async (action: "accept" | "reject") => {
    setBusy(action);
    try {
      await payoutApi.resolve(item._id, action, note);
      toast.success(action === "accept" ? "Shikoyat qabul qilindi, to'lov bekor qilindi" : "Shikoyat rad etildi");
      onDone();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy("");
    }
  };
  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title="Shikoyatni ko'rib chiqish"
      footer={
        <>
          <Button variant="secondary" loading={busy === "reject"} disabled={!!busy} onClick={() => go("reject")}>
            Rad etish — to'lov saqlanadi
          </Button>
          <Button variant="danger" loading={busy === "accept"} disabled={!!busy} onClick={() => go("accept")}>
            Qabul qilish — to'lov bekor
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-xs font-semibold text-ink-2 mb-1.5">Talaba shikoyati</p>
          <p className="text-sm text-ink whitespace-pre-line rounded-xl bg-amber-50 p-3">{item.studentFeedback.complaint?.text}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-ink-2 mb-1.5">Mentor izohi · {item.mentorFeedback?.score}/100</p>
          <p className="text-sm text-ink-2 whitespace-pre-line rounded-xl bg-mist p-3 max-h-56 overflow-y-auto">{item.mentorFeedback?.comment || "—"}</p>
        </div>
        {item.githubUrl && (
          <a href={item.githubUrl} target="_blank" rel="noreferrer" className="text-sm text-brand hover:underline truncate">
            Yechim: {item.githubUrl}
          </a>
        )}
        <Field label="Qaror izohi" hint="Talaba va mentorga yuboriladi">
          <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Masalan: izoh boshqa taskka tegishli ekan" />
        </Field>
      </div>
    </Modal>
  );
}

// ── Tarix ──────────────────────────────────────────────────────

function HistoryTab() {
  const toast = useToast();
  const q = useCachedQuery("admin:payout-history", () => payoutApi.history(), { staleTime: 15_000 });
  const [receipt, setReceipt] = useState<string | null>(null);
  if (q.loading) return <PageLoader />;
  if (!q.data) return <ErrorState message={q.error || "Xatolik"} onRetry={q.refetch} />;
  if (!q.data.length)
    return (
      <Card>
        <EmptyState title="Hali to'lovlar yo'q" />
      </Card>
    );
  const name = (p: MentorPayout) => (typeof p.mentorId === "object" ? p.mentorId.fullName : "—");
  return (
    <Card>
      <Table head={["Sana", "Mentor", "Tekshiruvlar", "Summa", "Bonus", "Jami", "Karta", "Izoh", ""]}>
        {q.data.map((p) => (
          <tr key={p._id}>
            <td className="px-4 py-3 whitespace-nowrap">{formatDate(p.paidAt, true)}</td>
            <td className="px-4 py-3 font-medium text-ink">{name(p)}</td>
            <td className="px-4 py-3">{p.reviews}</td>
            <td className="px-4 py-3 tabular-nums">{formatPrice(p.amount)}</td>
            <td className="px-4 py-3 tabular-nums">{p.bonus ? `+${formatPrice(p.bonus)}` : "—"}</td>
            <td className="px-4 py-3 font-semibold tabular-nums">{formatPrice(p.total)}</td>
            <td className="px-4 py-3 font-mono text-[12px] text-muted">{p.card?.number ? `•••• ${p.card.number.slice(-4)}` : "—"}</td>
            <td className="px-4 py-3 text-[13px] text-muted max-w-48 truncate">{p.note || "—"}</td>
            <td className="px-4 py-3">
              {p.receipt && (
                <Button size="sm" variant="ghost" onClick={() => payoutApi.receipt(p._id).then(setReceipt).catch((e) => toast.error(errorMessage(e)))}>
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
    </Card>
  );
}

// ── Stavkalar va qoidalar ──────────────────────────────────────

const RULES: { key: Exclude<keyof PayoutSettings, "rates">; label: string; hint: string; suffix: string }[] = [
  { key: "slaHours", label: "Tekshiruv muddati", hint: "Shu vaqt ichida tekshirsa — to'liq stavka", suffix: "soat" },
  { key: "lateRatePct", label: "Kechiksa to'lanadi", hint: "Stavkaning necha foizi", suffix: "%" },
  { key: "reassignHours", label: "Boshqa mentorga o'tkazish", hint: "Talaba shundan keyin mentorni almashtira oladi", suffix: "soat" },
  { key: "minCommentLength", label: "Izohning minimal uzunligi", hint: "Qisqa izoh bilan baholab bo'lmaydi", suffix: "belgi" },
  { key: "holdDays", label: "Kutish (shikoyat) davri", hint: "Shundan keyin summa tasdiqlanadi", suffix: "kun" },
  { key: "minPayout", label: "Minimal to'lov", hint: "Kami keyingi oyga o'tadi", suffix: "so'm" },
  { key: "payoutDay", label: "To'lov kuni", hint: "Har oyning shu sanasi (1–28)", suffix: "-sana" },
  { key: "bonusPct", label: "Sifat bonusi", hint: "To'lovga qo'shiladi", suffix: "%" },
  { key: "bonusThresholdPct", label: "Bonus uchun 👍 ulushi", hint: "Kamida", suffix: "%" },
  { key: "bonusMinRatings", label: "Bonus uchun baholar soni", hint: "Kamida", suffix: "ta" },
];

function SettingsTab() {
  const toast = useToast();
  const q = useCachedQuery("admin:payout-settings", payoutApi.settings, { staleTime: 30_000 });
  const [form, setForm] = useState<PayoutSettings | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (q.data) setForm(q.data);
  }, [q.data]);
  if (q.loading || !form) return q.error ? <ErrorState message={q.error} onRetry={q.refetch} /> : <PageLoader />;
  const ratesChanged = q.data && (["oson", "orta", "qiyin"] as const).some((d) => q.data!.rates[d] !== form.rates[d]);

  const save = async () => {
    setSaving(true);
    try {
      const r = await payoutApi.saveSettings(form);
      toast.success(r.message);
      q.mutate(r.data);
      invalidateCache("admin:payouts");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-[1fr_1.4fr] gap-4 items-start">
      <Card className="p-5 flex flex-col gap-4">
        <div>
          <p className="text-sm font-bold text-ink">Bitta tekshiruv uchun stavka</p>
          <p className="text-[13px] text-muted mt-1">O'zgarsa mentorlarga xabar boradi. Yangi stavka bundan keyingi tekshiruvlarga qo'llanadi.</p>
        </div>
        {(["oson", "orta", "qiyin"] as const).map((d) => (
          <Field key={d} label={DIFFICULTY[d].label}>
            <div className="relative">
              <Input
                type="number"
                min={0}
                step={500}
                value={form.rates[d]}
                onChange={(e) => setForm({ ...form, rates: { ...form.rates, [d]: Number(e.target.value) } })}
                className="pr-14 w-full"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[13px] text-muted">so'm</span>
            </div>
          </Field>
        ))}
        {ratesChanged && <Alert tone="info">Saqlaganingizda barcha mentorlarga Telegram orqali yangi stavkalar haqida xabar yuboriladi.</Alert>}
      </Card>
      <Card className="p-5 flex flex-col gap-4">
        <p className="text-sm font-bold text-ink">Qoidalar</p>
        <div className="grid sm:grid-cols-2 gap-4">
          {RULES.map((r) => (
            <Field key={r.key} label={r.label} hint={r.hint}>
              <div className="relative">
                <Input type="number" min={0} value={form[r.key]} onChange={(e) => setForm({ ...form, [r.key]: Number(e.target.value) })} className="pr-16 w-full" />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[13px] text-muted">{r.suffix}</span>
              </div>
            </Field>
          ))}
        </div>
        <Button onClick={save} loading={saving} className="self-start">
          Saqlash
        </Button>
      </Card>
    </div>
  );
}

// ── Shartnoma ──────────────────────────────────────────────────

function ContractTab() {
  const toast = useToast();
  const q = useCachedQuery("admin:contract", payoutApi.contract, { staleTime: 30_000 });
  const [text, setText] = useState("");
  const [major, setMajor] = useState(true);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (q.data) setText(q.data.current.text);
  }, [q.data]);
  if (q.loading) return <PageLoader />;
  if (!q.data) return <ErrorState message={q.error || "Xatolik"} onRetry={q.refetch} />;
  const { current, acceptances } = q.data;
  const changed = text.trim() !== current.text.trim();

  const save = async () => {
    setSaving(true);
    try {
      const r = await payoutApi.saveContract(text, major);
      toast.success(r.message);
      q.refetch();
      invalidateCache("admin:payouts");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid xl:grid-cols-[1.5fr_1fr] gap-4 items-start">
      <Card className="p-5 flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-bold text-ink">Oferta matni</p>
          <Badge tone="info">joriy: v{current.version}</Badge>
          <span className="text-[12px] text-muted ml-auto">yangilangan: {formatDate(current.updatedAt, true)}</span>
        </div>
        <p className="text-[13px] text-muted">
          {"{{oson}}, {{orta}}, {{qiyin}}, {{slaHours}}, {{holdDays}}, {{minPayout}}, {{payoutDay}}, {{bonusPct}}"} kabi belgilar o'rniga mentorga joriy qiymatlar ko'rsatiladi. Matnni
          yuristga ko'rsatib olishni tavsiya qilamiz.
        </p>
        <Textarea rows={22} value={text} onChange={(e) => setText(e.target.value)} className="font-mono text-[13px] leading-relaxed" spellCheck={false} />
        <Toggle
          checked={major}
          onChange={setMajor}
          label={major ? `Muhim o'zgarish — v${current.version + 1} sifatida e'lon qilinadi, mentorlar qayta tasdiqlaydi` : "Kichik tuzatish (imlo) — versiya o'zgarmaydi"}
        />
        <Button onClick={save} loading={saving} disabled={!changed} className="self-start">
          {major ? "Yangi versiyani e'lon qilish" : "Tuzatishni saqlash"}
        </Button>
      </Card>
      <Card>
        <div className="p-5 border-b border-line">
          <p className="text-sm font-bold text-ink">Tasdiqlaganlar</p>
          <p className="text-[13px] text-muted mt-1">Har bir tasdiq: ism, versiya, vaqt va IP manzil saqlanadi.</p>
        </div>
        {acceptances.length === 0 ? (
          <EmptyState title="Hali hech kim tasdiqlamagan" />
        ) : (
          <ul className="divide-y divide-line max-h-[640px] overflow-y-auto">
            {acceptances.map((a) => (
              <li key={a._id} className="px-5 py-3 flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink truncate">{a.mentorId?.fullName || "O'chirilgan"}</p>
                  <p className="text-[12px] text-muted">
                    "{a.typedName}" · {formatDate(a.acceptedAt, true)} · {a.ip || "—"}
                  </p>
                </div>
                <Badge tone={a.version === current.version ? "success" : "neutral"}>v{a.version}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
