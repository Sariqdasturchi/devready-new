import { useState } from "react";
import { HiOutlineInboxStack } from "react-icons/hi2";
import { adminApi } from "../../api/api";
import { useCachedQuery, invalidateCache } from "../../hooks/useCachedQuery";
import { Card, EmptyState, ErrorState, PageHeader, PageLoader, StatCard, Tabs } from "../../components/ui";
import ReviewModal from "../../components/review/ReviewModal";
import SubmissionRow from "../../components/review/SubmissionRow";
import type { Submission } from "../../types/type";

type Tab = "need-check" | "approved" | "rejected" | "expired" | "in_progress" | "all";

export default function SuperadminSubmissions() {
  const [tab, setTab] = useState<Tab>("need-check");
  const [open, setOpen] = useState<Submission | null>(null);
  const stats = useCachedQuery("admin:subStats", adminApi.submissionStats, { staleTime: 15_000 });
  const list = useCachedQuery(`admin:subs:${tab}`, () => adminApi.submissions(tab === "all" ? undefined : tab), { staleTime: 10_000 });
  const s = stats.data;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Topshiriqlar" subtitle="Barcha urinishlar. Mentori o'chirilgan yoki tayinlanmagan ishlarni shu yerdan o'zingiz baholashingiz mumkin." />
      {s && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard label="Tekshiruvda" value={s.pending} tone="warning" />
          <StatCard label="Qabul" value={s.approved} tone="success" />
          <StatCard label="Rad etilgan" value={s.rejected} tone="danger" />
          <StatCard label="Bajarilmagan" value={s.expired} tone="danger" />
          <StatCard label="O'rtacha ball" value={s.averageScore} tone="violet" />
        </div>
      )}
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: "need-check", label: "Tekshiruvda" },
          { value: "in_progress", label: "Bajarilmoqda" },
          { value: "approved", label: "Qabul qilingan" },
          { value: "rejected", label: "Rad etilgan" },
          { value: "expired", label: "Bajarilmagan" },
          { value: "all", label: "Barchasi" },
        ]}
      />
      <Card>
        {list.loading ? (
          <PageLoader />
        ) : list.error ? (
          <ErrorState message={list.error} onRetry={list.refetch} />
        ) : !list.data?.length ? (
          <EmptyState icon={<HiOutlineInboxStack />} title="Bu bo'limda yozuv yo'q" />
        ) : (
          <div className="divide-y divide-line">
            {list.data.map((sub) => (
              <SubmissionRow key={sub._id} s={sub} showMentor onOpen={() => setOpen(sub)} />
            ))}
          </div>
        )}
      </Card>
      <ReviewModal
        submission={open}
        onClose={() => setOpen(null)}
        onReviewed={() => {
          setOpen(null);
          invalidateCache("admin:stats", "admin:subs:approved", "admin:subs:rejected", "admin:subs:all");
          stats.refetch();
          list.refetch();
        }}
      />
    </div>
  );
}
