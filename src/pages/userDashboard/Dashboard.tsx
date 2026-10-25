import { useState } from "react";
import { Link } from "react-router-dom";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineFire,
  HiOutlineSparkles,
  HiOutlineTrophy,
  HiOutlineXCircle,
} from "react-icons/hi2";
import { analyticsApi, errorMessage } from "../../api/api";
import { useCachedQuery } from "../../hooks/useCachedQuery";
import { getStoredUser } from "../../lib/auth";
import { Badge, Card, CardHeader, EmptyState, ErrorState, PageHeader, PageLoader, ProgressBar, StatCard, StatusBadge, Tabs } from "../../components/ui";
import ActivityCalendar from "../../components/user/ActivityCalendar";
import GroupDeadlines from "../../components/user/GroupDeadlines";
import { formatDate, limitLabel, timeAgo } from "../../lib/format";
import type { Overview } from "../../types/type";
import { useChartColors } from "../../lib/theme";

type Period = "daily" | "weekly" | "monthly";
const PERIOD_LABEL: Record<Period, string> = { daily: "Bugun", weekly: "7 kun", monthly: "30 kun" };

export default function UserDashboard() {
  const cc = useChartColors();
  const [period, setPeriod] = useState<Period>("weekly");
  const overview = useCachedQuery<Overview>("user:overview", analyticsApi.overview, { staleTime: 15_000 });
  const calendar = useCachedQuery<Record<string, number>>("user:calendar", analyticsApi.calendar, { staleTime: 60_000 });

  if (overview.loading) return <PageLoader />;
  if (overview.error || !overview.data) return <ErrorState message={overview.error || errorMessage(null)} onRetry={overview.refetch} />;

  const o = overview.data;
  const p = o.periods[period];
  const planLimited = o.plan.taskLimit !== -1;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={
          <span className="flex items-center gap-2 flex-wrap">
            Salom, {o.user.fullName.split(" ")[0]}! <Badge tone="success">{o.averageDegree}</Badge>
          </span>
        }
        subtitle={o.user.direction ? `${o.user.direction} yo'nalishi bo'yicha faolligingiz` : "Yo'nalishingizni tanlang va tasklarni boshlang"}
        actions={
          <Link to="/dashboard/tasks" className="px-4 py-2.5 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand-deep">
            Tasklarga o'tish
          </Link>
        }
      />

      {/* Umumiy ko'rsatkichlar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="Jami XP" value={o.totalScore.toLocaleString()} icon={<HiOutlineSparkles />} tone="warning" hint={`Daraja: ${o.xpLevel}`} />
        <StatCard label="Reyting" value={o.rank ? `#${o.rank}` : "—"} icon={<HiOutlineTrophy />} tone="violet" hint="Umumiy liderboard" />
        <StatCard label="Bajarilgan" value={o.completedTasks} icon={<HiOutlineCheckCircle />} tone="success" hint={`${o.statusCounts.inReview} ta tekshiruvda`} />
        <StatCard label="Streak" value={`${o.streak} kun`} icon={<HiOutlineFire />} tone="danger" hint="Ketma-ket faol kunlar" />
      </div>

      <GroupDeadlines />

      {o.statusCounts.approved > 0 && <PublicProfileBanner approved={o.statusCounts.approved} />}

      {/* Davr bo'yicha faollik */}
      <Card>
        <CardHeader
          title="Faollik statistikasi"
          subtitle="Kunlik, haftalik va oylik ko'rsatkichlar"
          action={<Tabs value={period} onChange={setPeriod} items={(Object.keys(PERIOD_LABEL) as Period[]).map((k) => ({ value: k, label: PERIOD_LABEL[k] }))} />}
        />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px bg-mist border-t border-line">
          {[
            { label: "Boshlangan", value: p.started },
            { label: "Topshirilgan", value: p.submitted },
            { label: "Qabul qilingan", value: p.approved, cls: "text-brand" },
            { label: "Rad etilgan", value: p.rejected, cls: "text-rose-600" },
            { label: "Bajarilmagan", value: p.expired, cls: "text-rose-600" },
            { label: "Olingan XP", value: `+${p.xp}`, cls: "text-brand" },
          ].map((s) => (
            <div key={s.label} className="bg-surface px-4 py-4">
              <p className="text-[11px] text-muted">{s.label}</p>
              <p className={`text-xl font-bold mt-1 tabular-nums ${s.value && s.value !== "+0" && s.cls ? s.cls : "text-ink"}`}>{s.value}</p>
            </div>
          ))}
        </div>
        <div className="px-5 py-4 border-t border-line">
          <p className="text-xs text-muted mb-3">So'nggi 30 kunda olingan XP</p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={o.chart} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="xpFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={cc.brand} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={cc.brand} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={cc.grid} vertical={false} />
                <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(8)} tick={{ fill: cc.muted, fontSize: 11 }} axisLine={false} tickLine={false} interval={4} />
                <YAxis allowDecimals={false} tick={{ fill: cc.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={cc.tooltip} labelStyle={{ color: cc.muted }} itemStyle={{ color: cc.ink }}
                  labelFormatter={(d) => formatDate(String(d))}
                  formatter={(v) => [`${v} XP`, "XP"]}
                />
                <Area type="monotone" dataKey="xp" stroke={cc.brand} strokeWidth={2} fill="url(#xpFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Tarif */}
        <Card className="p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-ink">Tarif: {o.plan.name}</h3>
            <Link to="/dashboard/plans" className="text-xs font-semibold text-brand hover:underline">
              {o.plan.isFree ? "Yangilash" : "Batafsil"}
            </Link>
          </div>
          <div>
            <div className="flex justify-between text-xs text-muted mb-2">
              <span>Ishlatilgan tasklar</span>
              <span className="text-ink font-semibold">
                {o.plan.usedTasks} / {limitLabel(o.plan.taskLimit)}
              </span>
            </div>
            {planLimited && <ProgressBar value={o.plan.usedTasks} max={o.plan.taskLimit} tone={o.plan.remainingTasks === 0 ? "danger" : "success"} />}
          </div>
          {o.plan.remainingTasks === 0 && <p className="text-xs text-rose-600">Limit tugadi — yangi task boshlash uchun tarifni yangilang.</p>}
          {o.plan.expiresAt && <p className="text-xs text-muted">Amal qiladi: {formatDate(o.plan.expiresAt)} gacha</p>}
        </Card>

        {/* Holatlar */}
        <Card className="p-5 lg:col-span-2">
          <h3 className="text-sm font-bold text-ink mb-4">Tasklar holati</h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: "Bajarilmoqda", value: o.statusCounts.inProgress, icon: HiOutlineClock, cls: "text-muted" },
              { label: "Tekshiruvda", value: o.statusCounts.inReview, icon: HiOutlineClock, cls: "text-muted" },
              { label: "Qabul qilingan", value: o.statusCounts.approved, icon: HiOutlineCheckCircle, cls: "text-brand" },
              { label: "Rad etilgan", value: o.statusCounts.rejected, icon: HiOutlineXCircle, cls: "text-muted" },
              { label: "Bajarilmagan", value: o.statusCounts.expired, icon: HiOutlineXCircle, cls: "text-muted" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-line bg-mist p-3">
                <s.icon className={s.cls} size={18} />
                <p className="text-lg font-bold text-ink mt-2">{s.value}</p>
                <p className="text-[11px] text-muted">{s.label}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="text-sm font-bold text-ink mb-4">Kunlik faollik</h3>
        {calendar.data ? <ActivityCalendar data={calendar.data} /> : <PageLoader />}
      </Card>

      <Card>
        <CardHeader
          title="So'nggi natijalar"
          action={
            <Link to="/dashboard/completed" className="text-xs font-semibold text-brand hover:underline">
              Barchasi
            </Link>
          }
        />
        {o.recent.length === 0 ? (
          <EmptyState title="Hozircha natijalar yo'q" text="Birinchi taskni boshlang — natijalar shu yerda ko'rinadi" />
        ) : (
          <div className="divide-y divide-line border-t border-line">
            {o.recent.map((r) => (
              <Link key={r._id} to={r.taskId ? `/dashboard/tasks/${r.taskId}` : "#"} className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-mist">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink truncate">{r.title}</p>
                  <p className="text-xs text-muted mt-0.5">
                    {r.track} · {timeAgo(r.updatedAt)}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {r.status === "approved" && <span className="text-xs font-bold text-brand">+{r.earnedXP} XP</span>}
                  <StatusBadge status={r.status} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

/** Qabul qilingan yechim bo'lsa — ochiq profilni yoqishga yoki ulashishga undash */
function PublicProfileBanner({ approved }: { approved: number }) {
  const me = getStoredUser();
  const live = !!me?.profilePublic && !!me.username;
  return (
    <div className="rounded-2xl border border-line bg-surface p-5 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="min-w-0 flex-1">
        <p className="font-bold text-ink">{live ? "Ochiq profilingiz tayyor" : `${approved} ta tekshirilgan yechimingiz bor — ish beruvchiga ko'rsating`}</p>
        <p className="mt-1 text-[14px] text-ink-2">
          {live
            ? `devready.uz/u/${me!.username} — havolani rezyumega va HR'ga yuboring.`
            : "Ochiq profil yoqilsa, baholar, test natijalari va mentor izohlari bitta havolada ko'rinadi."}
        </p>
      </div>
      <Link
        to={live ? `/u/${me!.username}` : "/dashboard/settings#public-profile"}
        className="shrink-0 h-10 px-5 inline-flex items-center justify-center rounded-full bg-brand text-white text-sm font-semibold hover:bg-brand-deep"
      >
        {live ? "Profilni ko'rish" : "Ochiq profilni yoqish"}
      </Link>
    </div>
  );
}
