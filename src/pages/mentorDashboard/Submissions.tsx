import { useState } from "react";
import { HiOutlineInboxStack } from "react-icons/hi2";
import { mentorApi } from "../../api/api";
import { useCachedQuery, invalidateCache } from "../../hooks/useCachedQuery";
import { Card, EmptyState, ErrorState, PageHeader, PageLoader, Tabs } from "../../components/ui";
import ReviewModal from "../../components/review/ReviewModal";
import SubmissionRow from "../../components/review/SubmissionRow";
import type { Submission } from "../../types/type";

type Tab = "pending" | "reviewed";

export default function MentorSubmissions() {
  const [tab, setTab] = useState<Tab>("pending");
  const [open, setOpen] = useState<Submission | null>(null);
  const query = useCachedQuery(`mentor:subs:${tab}`, () => mentorApi.submissions(tab), { staleTime: 10_000 });

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Tekshiruvlar" subtitle="Sizga yuborilgan yechimlar. Har bir yechimni ochib, ball va izoh qoldiring." />
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: "pending", label: "Kutilmoqda" },
          { value: "reviewed", label: "Tekshirilgan" },
        ]}
      />
      <Card>
        {query.loading ? (
          <PageLoader />
        ) : query.error ? (
          <ErrorState message={query.error} onRetry={query.refetch} />
        ) : !query.data?.length ? (
          <EmptyState icon={<HiOutlineInboxStack />} title={tab === "pending" ? "Navbatda yechim yo'q" : "Hali hech narsa tekshirilmagan"} text={tab === "pending" ? "Yangi yechim kelganda Telegram va bildirishnoma orqali xabar beramiz" : undefined} />
        ) : (
          <div className="divide-y divide-line">
            {query.data.map((s) => (
              <SubmissionRow key={s._id} s={s} onOpen={() => setOpen(s)} />
            ))}
          </div>
        )}
      </Card>
      <ReviewModal
        submission={open}
        onClose={() => setOpen(null)}
        onReviewed={() => {
          setOpen(null);
          invalidateCache("mentor:subs:reviewed", "mentor:stats");
          query.refetch();
        }}
      />
    </div>
  );
}
