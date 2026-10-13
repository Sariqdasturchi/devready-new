import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { HiOutlineChartBar, HiOutlineCheckCircle, HiOutlineClock, HiOutlineSparkles } from "react-icons/hi2";
import { analyticsApi, taskApi } from "../../api/api";
import { useCachedQuery } from "../../hooks/useCachedQuery";
import { Card, CardHeader, EmptyState, ErrorState, PageHeader, PageLoader, ProgressBar, StatCard } from "../../components/ui";
import { formatDate, formatDuration } from "../../lib/format";
import { useChartColors } from "../../lib/theme";

const LEVELS = [
  { name: "Beginner", from: 0 },
  { name: "Junior", from: 500 },
  { name: "Strong Junior", from: 2000 },
  { name: "Middle", from: 5000 },
];

export default function MyPoints() {
  const cc = useChartColors();
  const stats = useCachedQuery("user:taskStats", taskApi.stats, { staleTime: 15_000 });
  const techs = useCachedQuery("user:techs", analyticsApi.technologies, { staleTime: 60_000 });

  if (stats.loading) return <PageLoader />;
  if (stats.error || !stats.data) return <ErrorState message={stats.error || "Xatolik"} onRetry={stats.refetch} />;

  const s = stats.data;
  const xp = s.totalPoints;
  // Daraja serverda hisoblanadi: test natijasi va XP ning yuqorisi
  const idx = s.level ? Math.max(0, LEVELS.findIndex((l) => l.name === s.level!.level)) : LEVELS.reduce((acc, l, i) => (xp >= l.from ? i : acc), 0);
  const current = LEVELS[idx];
  const next = LEVELS[idx + 1];
  const left = Math.max(0, next ? next.from - xp : 0);
  const breakdown = Object.entries(s.categoryBreakdown).map(([track, value]) => ({ track, xp: value }));

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Ballarim" subtitle="Tajriba ballari (XP), daraja va yo'nalishlar bo'yicha tahlil" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="Jami XP" value={xp.toLocaleString()} icon={<HiOutlineSparkles />} tone="warning" />
        <StatCard label="Bajarilgan tasklar" value={s.completedTasks} icon={<HiOutlineCheckCircle />} tone="success" />
        <StatCard label="O'rtacha baho" value={`${s.averageScore}/100`} icon={<HiOutlineChartBar />} tone="violet" />
        <StatCard label="O'rtacha vaqt" value={s.averageTime ? formatDuration(s.averageTime) : "—"} icon={<HiOutlineClock />} tone="info" />
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[13px] text-muted">Joriy daraja</p>
            <p className="text-xl font-bold text-ink">{current.name}</p>
          </div>
          {next && (
            <p className="text-xs text-muted text-right">
              {next.name} gacha
              <br />
              <span className="text-ink font-semibold">{left.toLocaleString()} XP</span> qoldi
            </p>
          )}
        </div>
        <ProgressBar value={next ? Math.max(0, xp - current.from) : 1} max={next ? next.from - current.from : 1} />
        {current.from > xp && (
          <p className="text-[12px] text-muted mt-2">Daraja kirish testi natijasida berilgan. XP to'plab keyingi darajaga chiqasiz.</p>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Yo'nalishlar bo'yicha XP" />
          {breakdown.length === 0 ? (
            <EmptyState title="Hozircha ma'lumot yo'q" text="Task bajaring — XP shu yerda ko'rinadi" />
          ) : (
            <div className="h-56 px-3 pb-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={breakdown} margin={{ left: -20, right: 8 }}>
                  <CartesianGrid stroke={cc.grid} vertical={false} />
                  <XAxis dataKey="track" tick={{ fill: cc.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: cc.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: cc.cursor }} contentStyle={cc.tooltip} labelStyle={{ color: cc.muted }} itemStyle={{ color: cc.ink }} />
                  <Bar dataKey="xp" name="XP" fill={cc.brand} radius={[6, 6, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Texnologiyalar" subtitle="AI tekshiruvida aniqlangan" />
          {!techs.data?.length ? (
            <EmptyState title="Hozircha aniqlanmagan" />
          ) : (
            <div className="px-5 pb-5 flex flex-wrap gap-2">
              {techs.data.map((t) => (
                <span key={t.technology} className="px-3 py-1.5 rounded-lg bg-mist border border-line text-xs text-ink-2">
                  {t.technology} <span className="text-muted">×{t.count}</span>
                </span>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader title="Ballar tarixi" />
        {s.history.length === 0 ? (
          <EmptyState title="Ballar tarixi bo'sh" />
        ) : (
          <div className="divide-y divide-line border-t border-line">
            {s.history.map((h) => (
              <div key={h.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink truncate">{h.description}</p>
                  <p className="text-xs text-muted">
                    {formatDate(h.date, true)} · baho {h.score}/100
                  </p>
                </div>
                <span className="text-sm font-bold text-brand shrink-0">+{h.points} XP</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
