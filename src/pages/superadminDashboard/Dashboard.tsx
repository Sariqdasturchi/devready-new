import { Link } from "react-router-dom";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  HiOutlineAcademicCap,
  HiOutlineBanknotes,
  HiOutlineClipboardDocumentCheck,
  HiOutlineClipboardDocumentList,
  HiOutlineUserPlus,
  HiOutlineUsers,
} from "react-icons/hi2";
import { adminApi } from "../../api/api";
import { useCachedQuery } from "../../hooks/useCachedQuery";
import { Avatar, Card, CardHeader, EmptyState, ErrorState, PageHeader, PageLoader, ProgressBar, StatCard } from "../../components/ui";
import { formatDate, formatPrice, timeAgo } from "../../lib/format";
import { useChartColors } from "../../lib/theme";

function MiniArea({ data, color, name }: { data: { date: string; count: number }[]; color: string; name: string }) {
  const cc = useChartColors();
  const id = `g-${name}`;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={cc.grid} vertical={false} />
        <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(8)} tick={{ fill: cc.muted, fontSize: 11 }} axisLine={false} tickLine={false} interval={4} />
        <YAxis allowDecimals={false} tick={{ fill: cc.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={cc.tooltip} labelStyle={{ color: cc.muted }} itemStyle={{ color: cc.ink }} labelFormatter={(d) => formatDate(String(d))} />
        <Area type="monotone" dataKey="count" name={name} stroke={color} strokeWidth={2} fill={`url(#${id})`} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export default function SuperadminDashboard() {
  const cc = useChartColors();
  const stats = useCachedQuery("admin:stats", adminApi.stats, { staleTime: 15_000 });
  const newUsers = useCachedQuery("admin:newUsers", adminApi.newUsers, { staleTime: 30_000 });

  if (stats.loading) return <PageLoader />;
  if (!stats.data) return <ErrorState message={stats.error || "Xatolik"} onRetry={stats.refetch} />;
  const s = stats.data;
  const trackTotal = s.tracks.reduce((a, t) => a + t.count, 0) || 1;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Statistika" subtitle="Platformaning umumiy holati" />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard label="Talabalar" value={s.users.total} icon={<HiOutlineUsers />} hint={`${s.users.blocked} bloklangan`} />
        <StatCard label="Yangi (7 kun)" value={s.users.newWeek} icon={<HiOutlineUserPlus />} tone="info" hint={`Bugun ${s.users.newToday}, 30 kunda ${s.users.newMonth}`} />
        <StatCard label="Faol (7 kun)" value={s.users.activeWeek} icon={<HiOutlineUsers />} tone="violet" hint={`Bugun: ${s.users.activeToday}`} />
        <StatCard label="Mentorlar" value={s.mentors} icon={<HiOutlineAcademicCap />} tone="warning" />
        <StatCard label="Tasklar" value={s.tasks.active} icon={<HiOutlineClipboardDocumentList />} tone="info" hint={`Jami: ${s.tasks.total}`} />
        <StatCard label="Pullik tarifda" value={s.users.paid} icon={<HiOutlineBanknotes />} tone="success" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Link to="/superadmin/dashboard/submissions">
          <StatCard label="Tekshiruv kutmoqda" value={s.submissions.needCheck} icon={<HiOutlineClipboardDocumentCheck />} tone="warning" hint={`Bajarilmoqda: ${s.submissions.inProgress}`} />
        </Link>
        <Link to="/superadmin/dashboard/payments">
          <StatCard label="Kutilayotgan to'lovlar" value={s.payments.pending} icon={<HiOutlineBanknotes />} tone={s.payments.pending ? "danger" : "neutral"} hint="Tasdiqlash kerak" />
        </Link>
        <StatCard label="Daromad" value={formatPrice(s.payments.revenueMonth)} icon={<HiOutlineBanknotes />} tone="success" hint={`30 kun · Jami: ${formatPrice(s.payments.revenue)}`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Ro'yxatdan o'tishlar" subtitle="So'nggi 30 kun" />
          <div className="h-52 px-3 pb-4">
            <MiniArea data={s.series.registrations} color={cc.brandSoft} name="Ro'yxatdan o'tish" />
          </div>
        </Card>
        <Card>
          <CardHeader title="Topshirilgan yechimlar" subtitle="So'nggi 30 kun" />
          <div className="h-52 px-3 pb-4">
            <MiniArea data={s.series.submissions} color={cc.brand} name="Yechimlar" />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5">
          <h3 className="text-sm font-bold text-ink mb-4">Natijalar</h3>
          {[
            { label: "Qabul qilingan", v: s.submissions.approved, tone: "success" as const },
            { label: "Rad etilgan", v: s.submissions.rejected, tone: "danger" as const },
            { label: "Bajarilmagan (vaqt tugagan)", v: s.submissions.expired, tone: "warning" as const },
          ].map((r) => (
            <div key={r.label} className="mb-3">
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-muted">{r.label}</span>
                <span className="text-ink font-semibold">{r.v}</span>
              </div>
              <ProgressBar value={r.v} max={s.submissions.total || 1} tone={r.tone} />
            </div>
          ))}
          <p className="text-xs text-muted mt-4">
            O'rtacha ball: <span className="text-ink font-semibold">{s.submissions.averageScore}</span>
          </p>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-bold text-ink mb-4">Yo'nalishlar</h3>
          {s.tracks.length === 0 ? (
            <p className="text-xs text-muted">Ma'lumot yo'q</p>
          ) : (
            s.tracks
              .sort((a, b) => b.count - a.count)
              .map((t) => (
                <div key={t.track} className="mb-3">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-muted">{t.track}</span>
                    <span className="text-ink font-semibold">{t.count}</span>
                  </div>
                  <ProgressBar value={t.count} max={trackTotal} tone="info" />
                </div>
              ))
          )}
        </Card>

        <Card>
          <CardHeader
            title="Yangi talabalar"
            action={
              <Link to="/superadmin/dashboard/users" className="text-xs font-semibold text-brand hover:underline">
                Barchasi
              </Link>
            }
          />
          {!newUsers.data?.length ? (
            <EmptyState title="7 kunda yangi talaba yo'q" />
          ) : (
            <div className="divide-y divide-line border-t border-line max-h-80 overflow-y-auto">
              {newUsers.data.map((u) => (
                <div key={u._id} className="flex items-center gap-3 px-5 py-3">
                  <Avatar name={u.fullName} src={u.avatar} size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink truncate">{u.fullName}</p>
                    <p className="text-[11px] text-muted">{u.direction || "Yo'nalish tanlanmagan"}</p>
                  </div>
                  <span className="text-[11px] text-muted shrink-0">{timeAgo(u.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
