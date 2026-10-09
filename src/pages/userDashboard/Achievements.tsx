import type { ComponentType } from "react";
import {
  HiOutlineAcademicCap,
  HiOutlineBolt,
  HiOutlineCodeBracket,
  HiOutlineFire,
  HiOutlineLockClosed,
  HiOutlineRocketLaunch,
  HiOutlineSparkles,
  HiOutlineStar,
  HiOutlineTrophy,
} from "react-icons/hi2";
import { analyticsApi, submissionApi } from "../../api/api";
import { useCachedQuery } from "../../hooks/useCachedQuery";
import { Card, ErrorState, PageHeader, PageLoader, ProgressBar, cx } from "../../components/ui";
import type { Overview, Submission } from "../../types/type";

type Badge = { title: string; desc: string; icon: ComponentType<{ size?: number }>; current: number; total: number };

/** Yutuqlar haqiqiy natijalardan hisoblanadi */
function buildBadges(o: Overview, subs: Submission[]): Badge[] {
  const approved = subs.filter((s) => s.status === "approved");
  const excellent = approved.filter((s) => s.reviewScore >= 90).length;
  const fast = approved.filter((s) => {
    if (!s.submittedAt) return false;
    const used = new Date(s.submittedAt).getTime() - new Date(s.startedAt).getTime();
    const given = new Date(s.dueAt).getTime() - new Date(s.startedAt).getTime();
    return given > 0 && used <= given / 2;
  }).length;
  const tracks = new Set(approved.map((s) => (typeof s.taskId === "object" && s.taskId ? s.taskId.track : null)).filter(Boolean)).size;

  return [
    { title: "Birinchi qadam", desc: "Birinchi taskni muvaffaqiyatli bajaring", icon: HiOutlineRocketLaunch, current: approved.length, total: 1 },
    { title: "Clean Coder", desc: "10 ta taskni muvaffaqiyatli bajaring", icon: HiOutlineCodeBracket, current: approved.length, total: 10 },
    { title: "Marafonchi", desc: "50 ta taskni muvaffaqiyatli bajaring", icon: HiOutlineTrophy, current: approved.length, total: 50 },
    { title: "A'lochi", desc: "5 ta taskdan 90+ ball oling", icon: HiOutlineStar, current: excellent, total: 5 },
    { title: "Tezkor", desc: "3 ta taskni ajratilgan vaqtning yarmida topshiring", icon: HiOutlineBolt, current: fast, total: 3 },
    { title: "Streak Master", desc: "7 kun ketma-ket faol bo'ling", icon: HiOutlineFire, current: o.streak, total: 7 },
    { title: "XP ovchisi", desc: "1000 XP to'plang", icon: HiOutlineSparkles, current: o.totalScore, total: 1000 },
    { title: "Ko'p qirrali", desc: "2 xil yo'nalishda task bajaring", icon: HiOutlineAcademicCap, current: tracks, total: 2 },
  ];
}

export default function Achievements() {
  const overview = useCachedQuery("user:overview", analyticsApi.overview, { staleTime: 15_000 });
  const subs = useCachedQuery("user:submissions", submissionApi.mine, { staleTime: 15_000 });

  if (overview.loading || subs.loading) return <PageLoader />;
  if (!overview.data || !subs.data) return <ErrorState message="Ma'lumotlarni yuklab bo'lmadi" onRetry={() => { overview.refetch(); subs.refetch(); }} />;

  const badges = buildBadges(overview.data, subs.data);
  const unlocked = badges.filter((b) => b.current >= b.total).length;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Yutuqlar" subtitle={`${badges.length} tadan ${unlocked} ta yutuq ochilgan`} />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {badges.map((b) => {
          const done = b.current >= b.total;
          const Icon = b.icon;
          return (
            <Card key={b.title} className={cx("p-5 flex flex-col gap-3", done ? "border-brand/30" : "opacity-80")}>
              <div className="flex items-center justify-between">
                <span className={cx("w-11 h-11 rounded-xl border flex items-center justify-center", done ? "bg-brand-tint border-brand/30 text-brand" : "bg-mist border-line text-muted")}>
                  <Icon size={22} />
                </span>
                {!done && <HiOutlineLockClosed className="text-muted" />}
              </div>
              <div>
                <p className="text-sm font-bold text-ink">{b.title}</p>
                <p className="text-xs text-muted mt-0.5">{b.desc}</p>
              </div>
              <div className="mt-auto">
                <ProgressBar value={Math.min(b.current, b.total)} max={b.total} tone={done ? "success" : "info"} />
                <p className="text-[11px] text-muted mt-1.5">
                  {Math.min(b.current, b.total)} / {b.total}
                </p>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
