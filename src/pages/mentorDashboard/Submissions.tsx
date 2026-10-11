import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { HiOutlineInboxStack } from "react-icons/hi2";
import { errorMessage, mentorApi, submissionApi } from "../../api/api";
import { useToast } from "../../components/ui/toast";
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
  const [params, setParams] = useSearchParams();
  const toast = useToast();

  // Telegram yoki bildirishnomadagi havola: ?open=<submissionId> — yechim darhol ochiladi
  const openId = params.get("open");
  useEffect(() => {
    if (!openId) return;
    submissionApi
      .get(openId)
      .then((s) => {
        if (s.status !== "under_review") setTab("reviewed");
        setOpen(s);
      })
      .catch((e) => toast.error(errorMessage(e, "Yechim topilmadi")))
      .finally(() => setParams({}, { replace: true }));
  }, [openId, setParams, toast]);

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
