import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { HiOutlineChevronRight, HiOutlineInboxStack } from "react-icons/hi2";
import { submissionApi } from "../../api/api";
import { useCachedQuery } from "../../hooks/useCachedQuery";
import { Card, EmptyState, ErrorState, PageHeader, PageLoader, StatusBadge, Tabs } from "../../components/ui";
import { IN_REVIEW } from "../../lib/constants";
import { formatDate } from "../../lib/format";
import type { Submission, SubmissionStatus } from "../../types/type";

type Filter = "all" | "approved" | "review" | "rejected" | "expired";
const MATCH: Record<Filter, (s: SubmissionStatus) => boolean> = {
  all: (s) => s !== "in_progress",
  approved: (s) => s === "approved",
  review: (s) => IN_REVIEW.includes(s),
  rejected: (s) => s === "rejected",
  expired: (s) => s === "expired",
};

export default function CompletedTasks() {
  const query = useCachedQuery<Submission[]>("user:submissions", submissionApi.mine, { staleTime: 10_000 });
  const [filter, setFilter] = useState<Filter>("all");
  const list = useMemo(() => query.data || [], [query.data]);
  const count = (f: Filter) => list.filter((s) => MATCH[f](s.status)).length;
  const visible = list.filter((s) => MATCH[filter](s.status));

  if (query.loading) return <PageLoader />;
  if (query.error) return <ErrorState message={query.error} onRetry={query.refetch} />;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Natijalarim" subtitle="Barcha urinishlaringiz: qabul qilingan, tekshiruvdagi, rad etilgan va vaqti tugagan tasklar" />
      <Tabs
        value={filter}
        onChange={setFilter}
        items={[
          { value: "all", label: "Barchasi", count: count("all") },
          { value: "approved", label: "Bajarilgan", count: count("approved") },
          { value: "review", label: "Tekshiruvda", count: count("review") },
          { value: "rejected", label: "Rad etilgan", count: count("rejected") },
          { value: "expired", label: "Bajarilmagan", count: count("expired") },
        ]}
      />
      <Card>
        {visible.length === 0 ? (
          <EmptyState icon={<HiOutlineInboxStack />} title="Bu bo'limda hech narsa yo'q" text="Task bajarib, tekshirishga yuboring — natijalar shu yerda chiqadi" />
        ) : (
          <div className="divide-y divide-line">
            {visible.map((s) => {
              const task = typeof s.taskId === "object" ? s.taskId : null;
              const mentor = typeof s.mentorId === "object" ? s.mentorId : null;
              return (
                <Link
                  key={s._id}
                  to={task ? `/dashboard/tasks/${task._id}` : "#"}
                  className="flex items-center gap-4 px-4 sm:px-5 py-4 hover:bg-mist"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-ink truncate">{task?.title || "O'chirilgan task"}</p>
                      {(s.try || 1) > 1 && <span className="text-[11px] text-muted">{s.try}-urinish</span>}
                    </div>
                    <p className="text-xs text-muted mt-1">
                      {task?.track} · {s.status === "expired" ? `Muddat: ${formatDate(s.dueAt, true)}` : `Yuborilgan: ${formatDate(s.submittedAt || s.startedAt, true)}`}
                      {s.reviewMethod && ` · ${s.reviewMethod === "ai" ? "AI" : mentor ? `Mentor: ${mentor.fullName}` : "Mentor"}`}
                    </p>
                    {s.mentorFeedback?.comment && <p className="text-xs text-ink-2 mt-1.5 line-clamp-1">💬 {s.mentorFeedback.comment}</p>}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {(s.status === "approved" || s.status === "rejected") && (
                      <div className="text-right hidden sm:block">
                        <p className="text-sm font-bold text-ink">{s.reviewScore}/100</p>
                        {s.status === "approved" && <p className="text-[11px] font-semibold text-brand">+{s.earnedXP} XP</p>}
                      </div>
                    )}
                    <StatusBadge status={s.status} />
                    <HiOutlineChevronRight className="text-muted" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
