import { Link, useNavigate } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { HiOutlineCheckBadge, HiOutlineClipboardDocumentCheck, HiOutlineClock, HiOutlineStar } from "react-icons/hi2";
import { mentorApi } from "../../api/api";
import { useCachedQuery } from "../../hooks/useCachedQuery";
import { getStoredUser } from "../../lib/auth";
import { Alert, Card, CardHeader, EmptyState, ErrorState, PageHeader, PageLoader, StatCard } from "../../components/ui";
import SubmissionRow from "../../components/review/SubmissionRow";

export default function MentorDashboard() {
  const user = getStoredUser();
  const navigate = useNavigate();
  const stats = useCachedQuery("mentor:stats", mentorApi.stats, { staleTime: 15_000 });
  const queue = useCachedQuery("mentor:subs:pending", () => mentorApi.submissions("pending"), { staleTime: 10_000 });

  if (stats.loading) return <PageLoader />;
  if (!stats.data) return <ErrorState message={stats.error || "Xatolik"} onRetry={stats.refetch} />;
  const s = stats.data;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={`Salom, ${user?.fullName?.split(" ")[0] || "mentor"}!`} subtitle={`${user?.direction || ""} yo'nalishi bo'yicha tekshiruvlar`} />
      {user?.isAvailable === false && <Alert tone="warning">Siz "band" holatidasiz — talabalar sizni tanlay olmaydi. Sozlamalardan o'zgartirishingiz mumkin.</Alert>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="Navbatda" value={s.pending} icon={<HiOutlineClock />} tone="warning" />
        <StatCard label="Shu hafta" value={s.reviewedThisWeek} icon={<HiOutlineClipboardDocumentCheck />} tone="info" hint="tekshirilgan" />
        <StatCard label="Jami tekshirilgan" value={s.reviewed} icon={<HiOutlineCheckBadge />} tone="success" hint={`${s.approved} ta qabul qilingan`} />
        <StatCard label="O'rtacha ball" value={s.avgScore} icon={<HiOutlineStar />} tone="violet" />
      </div>

      <Card>
        <CardHeader title="So'nggi 30 kun" subtitle="Kunlik tekshiruvlar soni" />
        {s.daily.length === 0 ? (
          <EmptyState title="Hali tekshiruvlar yo'q" />
        ) : (
          <div className="h-52 px-3 pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={s.daily} margin={{ left: -20, right: 8 }}>
                <CartesianGrid stroke="#eef1f5" vertical={false} />
                <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(5)} tick={{ fill: "#697386", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: "#697386", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: "rgba(31,75,255,0.06)" }} contentStyle={{ background: "#fff", border: "1px solid #e3e8ef", borderRadius: 12, fontSize: 12, boxShadow: "0 8px 24px -12px rgba(7,10,19,.25)" }} />
                <Bar dataKey="count" name="Tekshiruvlar" fill="#1f4bff" radius={[6, 6, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader
          title="Navbatdagi yechimlar"
          action={
            <Link to="/mentor/dashboard/submissions" className="text-xs font-semibold text-brand hover:underline">
              Barchasi
            </Link>
          }
        />
        {!queue.data?.length ? (
          <EmptyState title="Navbat bo'sh 🎉" />
        ) : (
          <div className="divide-y divide-line border-t border-line">
            {queue.data.slice(0, 5).map((sub) => (
              <SubmissionRow key={sub._id} s={sub} onOpen={() => navigate("/mentor/dashboard/submissions")} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
