import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { errorMessage, taskApi } from "../../api/api";
import type { UserTask } from "../../types/type";
import { getStoredUser, getToken } from "../../lib/auth";
import { trackVisit } from "../../lib/track";
import { ErrorState, PageLoader } from "../ui";
import Seo from "../Seo";
import CodeWorkspace from "./CodeWorkspace";
import WebWorkspace from "./WebWorkspace";
import { kindOf } from "./kinds";

/** Ro'yxatdan o'tmasdan sinab ko'rish: /try/:id — kod muhiti to'liq ishlaydi, yuborishda ro'yxatdan o'tish so'raladi */
export default function TryWorkspace() {
  const { id = "" } = useParams();
  const [task, setTask] = useState<UserTask | null>(null);
  const [error, setError] = useState("");
  const user = getToken() ? getStoredUser() : null;

  useEffect(() => {
    trackVisit();
    taskApi
      .publicGet(id)
      .then((t) => setTask({ ...t, status: "not_started", submissionId: null, submission: null, dueAt: null }))
      .catch((err) => setError(errorMessage(err, "Vazifa topilmadi")));
  }, [id]);

  // Tizimga kirgan talaba — o'z kabinetidagi taskka
  if (user?.role === "user") return <Navigate to={`/dashboard/tasks/${id}`} replace />;
  if (error)
    return (
      <div className="p-6 flex flex-col gap-4 items-start">
        <ErrorState message={error} />
        <Link to="/tasks" className="text-sm font-semibold text-brand">
          Barcha tasklar
        </Link>
      </div>
    );
  if (!task) return <PageLoader />;
  if (!task.sandbox?.enabled) return <Navigate to={`/tasks?open=${task._id}`} replace />;
  return (
    <>
      <Seo title={`${task.title} — sinab ko'rish`} description={task.description} />
      {kindOf(task.sandbox) === "web" ? <WebWorkspace guest task={task} offset={0} /> : <CodeWorkspace guest task={task} offset={0} />}
    </>
  );
}
