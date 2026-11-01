import { useMemo, useState } from "react";
import { funnelApi, type FunnelData, type FunnelStep } from "../../api/api";
import { useCachedQuery } from "../../hooks/useCachedQuery";
import { Alert, Card, ErrorState, PageHeader, PageLoader, Select, cx } from "../../components/ui";

const DAYS = [7, 14, 30, 90];
const SOURCE_LABEL: Record<string, string> = {
  instagram: "Instagram",
  telegram: "Telegram",
  google: "Google",
  youtube: "YouTube",
  facebook: "Facebook",
  direct: "To'g'ridan-to'g'ri",
  other: "Boshqa saytlar",
};

const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

/** Superadmin: odamlar qaysi qadamda to'xtayapti — saytga kirishdan to'lovgacha */
export default function Funnel() {
  const [days, setDays] = useState(30);
  const [source, setSource] = useState("");
  const query = useCachedQuery<FunnelData>(`admin:funnel:${days}:${source}`, () => funnelApi.get(days, source), { staleTime: 30_000 });
  const data = query.data;

  return (
    <div>
      <PageHeader
        title="Voronka"
        subtitle="Saytga kirgan odam qaysi qadamda to'xtayapti. Eng katta yo'qotish — birinchi tuzatiladigan joy."
        actions={
          <>
            <div className="flex gap-0.5 rounded-full bg-mist p-1" role="tablist" aria-label="Davr">
              {DAYS.map((d) => (
                <button
                  key={d}
                  type="button"
                  role="tab"
                  aria-selected={days === d}
                  onClick={() => setDays(d)}
                  className={cx("h-8 px-3 rounded-full text-[13px] font-semibold cursor-pointer", days === d ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink")}
                >
                  {d} kun
                </button>
              ))}
            </div>
            <Select value={source} onChange={(e) => setSource(e.target.value)} aria-label="Manba" className="h-10 w-48">
              <option value="">Barcha manbalar</option>
              {Object.entries(SOURCE_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </>
        }
      />
      {query.error ? (
        <ErrorState message={query.error} onRetry={query.refetch} />
      ) : !data ? (
        <PageLoader />
      ) : (
        <div className="flex flex-col gap-6">
          {!data.tracking && (
            <Alert tone="info">
              Saytdagi qadamlar (kirish, sinab ko'rish) yangi versiya deploy qilingandan keyin yig'ila boshlaydi. Ro'yxatdan o'tish va faollik qadamlari bazadan hisoblanadi —
              ular hozirdan to'g'ri.
            </Alert>
          )}
          <FunnelSteps steps={data.steps} />
          <div className="grid lg:grid-cols-2 gap-6">
            <SourceTable data={data} />
            <Daily data={data} />
          </div>
          <Card className="p-5 text-[14px] text-ink-2 flex flex-wrap gap-x-8 gap-y-2">
            <span>
              Telegram tugmasi orqali: <b className="text-ink tabular-nums">{data.methods.telegramLink}</b>
            </span>
            <span>
              ID'ni qo'lda kiritib: <b className="text-ink tabular-nums">{data.methods.manualId}</b>
            </span>
            <span>
              Kirish testini o'tkazib yubordi: <b className="text-ink tabular-nums">{data.methods.quizSkipped}</b>
            </span>
            <span>
              Google tugmasi: <b className="text-ink tabular-nums">{data.methods.google ?? 0}</b>
            </span>
            <span>
              GitHub tugmasi: <b className="text-ink tabular-nums">{data.methods.github ?? 0}</b>
            </span>
            <span>
              Google/GitHub orqali yangi akkaunt: <b className="text-ink tabular-nums">{data.methods.oauthUsers ?? 0}</b>
            </span>
            <span>
              Telefondan "kompyuterda davom ettirish": <b className="text-ink tabular-nums">{data.methods.handoff ?? 0}</b>
            </span>
          </Card>
          <UtmBuilder />
        </div>
      )}
    </div>
  );
}

function FunnelSteps({ steps }: { steps: FunnelStep[] }) {
  const max = Math.max(1, ...steps.map((s) => s.count));
  // Eng katta yo'qotish: ketma-ket qadamlar orasida eng ko'p foiz yo'qolgan joy (kamida 5 kishi bo'lsa)
  const worst = useMemo(() => {
    let best = -1;
    let loss = 0;
    for (let i = 1; i < steps.length; i++) {
      const prev = steps[i - 1].count;
      if (prev < 5) continue;
      const l = 1 - steps[i].count / prev;
      if (l > loss) {
        loss = l;
        best = i;
      }
    }
    return best;
  }, [steps]);

  return (
    <Card className="p-5 sm:p-6">
      <ol className="flex flex-col">
        {steps.map((s, i) => {
          const head = i === 0 || steps[i - 1].group !== s.group;
          // Foiz faqat bir guruh ichida: saytdagi qadamlar anonim brauzerlar, qolganlari — bazadagi foydalanuvchilar
          const prev = !head ? steps[i - 1].count : 0;
          const conv = !head ? pct(s.count, prev) : null;
          return (
            <li key={s.key}>
              {head && <p className={cx("text-[12px] font-semibold text-muted", i > 0 && "mt-5 pt-4 border-t border-line")}>{s.group}</p>}
              <div className={cx("grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[16rem_minmax(0,1fr)_7rem] items-center gap-x-4 gap-y-1 py-2 rounded-lg", worst === i && "bg-rose-50 -mx-2 px-2")}>
                <span className="text-[14px] text-ink">{s.label}</span>
                <span className="text-right sm:order-3 text-[13px] tabular-nums">
                  <b className="text-ink text-[15px]">{s.count}</b>
                  {conv !== null && <span className={cx("ml-2", worst === i ? "text-rose-600 font-semibold" : "text-muted")}>{prev ? `${conv}%` : "—"}</span>}
                </span>
                <div className="col-span-2 sm:col-span-1 sm:order-2 h-2.5 rounded-full bg-line/60 overflow-hidden" title={`${s.label}: ${s.count}`}>
                  <div className="h-full rounded-full bg-brand" style={{ width: `${(s.count / max) * 100}%` }} />
                </div>
              </div>
              {worst === i && (
                <p className="text-[12px] text-rose-600 -mt-0.5 mb-1">
                  Eng katta yo'qotish: {prev - s.count} kishi ({100 - (conv || 0)}%) shu qadamda to'xtagan
                </p>
              )}
            </li>
          );
        })}
      </ol>
      <p className="mt-4 text-[12px] text-muted">Foiz — shu guruhdagi oldingi qadamdan o'tganlar ulushi. Saytdagi qadamlar noyob brauzerlar, qolganlari — shu davrda ro'yxatdan o'tganlar soni.</p>
    </Card>
  );
}

function SourceTable({ data }: { data: FunnelData }) {
  return (
    <Card className="p-5 sm:p-6">
      <h2 className="text-[15px] font-bold text-ink mb-4">Qayerdan kelishdi</h2>
      {data.bySource.length ? (
        <table className="w-full text-[14px]">
          <thead>
            <tr className="text-left text-[12px] text-muted">
              <th className="font-semibold pb-2">Manba</th>
              <th className="font-semibold pb-2 text-right">Kirdi</th>
              <th className="font-semibold pb-2 text-right">Ro'yxatdan o'tdi</th>
              <th className="font-semibold pb-2 text-right">Task boshladi</th>
              <th className="font-semibold pb-2 text-right">To'ladi</th>
            </tr>
          </thead>
          <tbody>
            {data.bySource.map((r) => (
              <tr key={r.source} className="border-t border-line">
                <td className="py-2 text-ink">{SOURCE_LABEL[r.source] || r.source}</td>
                <td className="py-2 text-right tabular-nums">{r.visitors}</td>
                <td className="py-2 text-right tabular-nums">
                  {r.registered}
                  {r.visitors > 0 && <span className="text-muted text-[12px] ml-1">({pct(r.registered, r.visitors)}%)</span>}
                </td>
                <td className="py-2 text-right tabular-nums">{r.started}</td>
                <td className="py-2 text-right tabular-nums">{r.paid}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-[14px] text-muted">Hali ma'lumot yo'q.</p>
      )}
      <p className="mt-4 text-[12px] text-muted">Manba reklama havolasidagi ?utm_source=instagram yoki saytga qaysi saytdan o'tilgani bo'yicha aniqlanadi.</p>
    </Card>
  );
}

function Daily({ data }: { data: FunnelData }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.daily.map((d) => d.visits));
  const h = hover !== null ? data.daily[hover] : null;
  return (
    <Card className="p-5 sm:p-6 flex flex-col">
      <div className="flex items-baseline justify-between gap-3 mb-4">
        <h2 className="text-[15px] font-bold text-ink">Saytga kirganlar, kunlik</h2>
        <p className="text-[12px] text-muted tabular-nums min-h-[1rem]">
          {h ? `${h.date}: ${h.visits} kirdi · ${h.registrations} ro'yxatdan o'tdi` : `Jami ${data.daily.reduce((a, d) => a + d.visits, 0)} kirish`}
        </p>
      </div>
      <div className="flex-1 min-h-40 flex items-end gap-[2px]" onMouseLeave={() => setHover(null)} role="img" aria-label="Kunlik kirishlar">
        {data.daily.map((d, i) => (
          <div key={d.date} className="flex-1 h-full flex items-end cursor-default" onMouseEnter={() => setHover(i)}>
            <div
              className={cx("w-full rounded-t-[4px]", hover === i ? "bg-brand-deep" : "bg-brand")}
              style={{ height: `${Math.max(d.visits ? 3 : 0, (d.visits / max) * 100)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-muted tabular-nums">
        <span>{data.daily[0]?.date}</span>
        <span>{data.daily[data.daily.length - 1]?.date}</span>
      </div>
    </Card>
  );
}

/**
 * Reklama/post havolasi yasash: utm bo'lmasa Telegram va Instagram ichidagi brauzerdan kelganlar
 * "to'g'ridan-to'g'ri" bo'lib qoladi. Har bir post uchun alohida campaign — qaysi post ishlaganini ko'rasiz.
 */
function UtmBuilder() {
  const [src, setSrc] = useState("telegram");
  const [campaign, setCampaign] = useState("");
  const [path, setPath] = useState("/");
  const [copied, setCopied] = useState(false);
  const url = useMemo(() => {
    const p = new URLSearchParams({ utm_source: src });
    if (campaign.trim()) p.set("utm_campaign", campaign.trim().toLowerCase().replace(/\s+/g, "-"));
    const clean = path.startsWith("/") ? path : `/${path}`;
    return `${window.location.origin}${clean}?${p.toString()}`;
  }, [src, campaign, path]);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* e'tiborsiz */
    }
  };
  return (
    <Card className="p-5 flex flex-col gap-3">
      <div>
        <p className="text-[15px] font-semibold text-ink">Post uchun havola</p>
        <p className="text-[13px] text-muted mt-0.5">Har bir post va reklamaga shu havolani qo'ying — "To'g'ridan-to'g'ri" o'rniga aniq manba ko'rinadi.</p>
      </div>
      <div className="grid sm:grid-cols-3 gap-2">
        <select value={src} onChange={(e) => setSrc(e.target.value)} className="h-10 px-3 rounded-xl border border-line bg-surface text-[14px] text-ink">
          {["telegram", "instagram", "youtube", "facebook", "google"].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <input value={campaign} onChange={(e) => setCampaign(e.target.value)} placeholder="Kampaniya (masalan, kanal-1-noyabr)" className="h-10 px-3 rounded-xl border border-line bg-surface text-[14px] text-ink" />
        <select value={path} onChange={(e) => setPath(e.target.value)} className="h-10 px-3 rounded-xl border border-line bg-surface text-[14px] text-ink">
          <option value="/">Bosh sahifa</option>
          <option value="/tasks">Tasklar katalogi</option>
          <option value="/tasks?track=Frontend">Frontend tasklari</option>
          <option value="/register">Ro'yxatdan o'tish</option>
          <option value="/contests">Musobaqa</option>
        </select>
      </div>
      <div className="flex items-center gap-2">
        <code className="flex-1 min-w-0 truncate px-3 h-10 leading-10 rounded-xl bg-mist text-[13px] text-ink font-mono">{url}</code>
        <button type="button" onClick={copy} className="h-10 px-4 rounded-xl bg-brand text-white text-[14px] font-semibold cursor-pointer shrink-0">
          {copied ? "Nusxalandi" : "Nusxalash"}
        </button>
      </div>
    </Card>
  );
}
