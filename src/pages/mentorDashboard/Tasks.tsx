import { useState } from "react";
import { taskApi } from "../../api/api";
import { useCachedQuery } from "../../hooks/useCachedQuery";
import { Card, ErrorState, PageHeader, PageLoader } from "../../components/ui";
import { TaskTile, TaskViewModal, TasksEmpty, useTaskFilters } from "../../components/TaskBrowser";
import type { Task } from "../../types/type";

export default function MentorTasks() {
  const query = useCachedQuery("mentor:tasks", () => taskApi.all(), { staleTime: 30_000 });
  const { visible, filters } = useTaskFilters(query.data || []);
  const [open, setOpen] = useState<Task | null>(null);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Tasklar" subtitle="Platformadagi barcha tasklar — tekshiruv paytida shartlarni ko'rish uchun" />
      {filters}
      {query.loading ? (
        <PageLoader />
      ) : query.error ? (
        <ErrorState message={query.error} onRetry={query.refetch} />
      ) : visible.length === 0 ? (
        <Card>
          <TasksEmpty />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {visible.map((t) => (
            <TaskTile key={t._id} task={t} onClick={() => setOpen(t)} />
          ))}
        </div>
      )}
      <TaskViewModal task={open} onClose={() => setOpen(null)} />
    </div>
  );
}
