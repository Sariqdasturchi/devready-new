import { useMemo, useState } from "react";
import { HiOutlineClipboardDocumentList, HiOutlineMagnifyingGlass } from "react-icons/hi2";
import { taskApi } from "../../api/api";
import { useCachedQuery } from "../../hooks/useCachedQuery";
import { EmptyState, ErrorState, Input, PageHeader, PageLoader, Select, Tabs } from "../../components/ui";
import TaskCard from "../../components/user/TaskCard";
import DirectionPicker from "../../components/user/DirectionPicker";
import { DIFFICULTY, IN_REVIEW } from "../../lib/constants";
import type { TaskStatus, UserTask } from "../../types/type";

type Filter = "all" | "new" | "active" | "review" | "approved" | "failed";

const MATCH: Record<Filter, (s: TaskStatus) => boolean> = {
  all: () => true,
  new: (s) => s === "not_started",
  active: (s) => s === "in_progress",
  review: (s) => IN_REVIEW.includes(s),
  approved: (s) => s === "approved",
  failed: (s) => s === "rejected" || s === "expired",
};

export default function UserTasks() {
  const query = useCachedQuery("user:tasks", taskApi.my, { staleTime: 10_000 });
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState("");

  const tasks: UserTask[] = useMemo(() => query.data?.data || [], [query.data]);
  const counts = useMemo(() => {
    const c = {} as Record<Filter, number>;
    (Object.keys(MATCH) as Filter[]).forEach((f) => (c[f] = tasks.filter((t) => MATCH[f](t.status)).length));
    return c;
  }, [tasks]);

  const visible = tasks
    .filter((t) => MATCH[filter](t.status))
    .filter((t) => !difficulty || t.difficulty === difficulty)
    .filter((t) => t.title.toLowerCase().includes(search.trim().toLowerCase()))
    // Bajarilayotganlar doim yuqorida
    .sort((a, b) => Number(b.status === "in_progress") - Number(a.status === "in_progress"));

  if (query.loading) return <PageLoader label="Vazifalar yuklanmoqda..." />;
  if (query.error) return <ErrorState message={query.error} onRetry={query.refetch} />;
  if (query.data?.needsDirection) return <DirectionPicker onSaved={query.refetch} />;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Vazifalar" subtitle="Yo'nalishingiz bo'yicha amaliy tasklar. Taskni oching, shartlarini o'qing va boshlang." />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <Tabs
          value={filter}
          onChange={setFilter}
          items={[
            { value: "all", label: "Barchasi", count: counts.all },
            { value: "new", label: "Yangi", count: counts.new },
            { value: "active", label: "Bajarilmoqda", count: counts.active },
            { value: "review", label: "Tekshiruvda", count: counts.review },
            { value: "approved", label: "Bajarilgan", count: counts.approved },
            { value: "failed", label: "Bajarilmagan", count: counts.failed },
          ]}
        />
        <div className="flex gap-2">
          <div className="relative flex-1 lg:flex-none lg:w-64">
            <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Qidirish..." className="pl-9" />
          </div>
          <Select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="w-36">
            <option value="">Qiyinlik</option>
            {Object.entries(DIFFICULTY).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={<HiOutlineClipboardDocumentList />}
          title={tasks.length ? "Bu bo'limda task yo'q" : "Hozircha tasklar qo'shilmagan"}
          text={tasks.length ? "Boshqa filtrni tanlab ko'ring" : "Yo'nalishingiz bo'yicha yangi tasklar tez orada qo'shiladi"}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {visible.map((t) => (
            <TaskCard key={t._id} task={t} />
          ))}
        </div>
      )}
    </div>
  );
}
