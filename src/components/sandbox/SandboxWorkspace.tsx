import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { errorMessage, taskApi } from "../../api/api";
import type { UserTask } from "../../types/type";
import { ErrorState, PageLoader } from "../ui";
import CodeWorkspace from "./CodeWorkspace";
import WebWorkspace from "./WebWorkspace";
import { kindOf } from "./kinds";

/**
 * Butun ekranli kod muhiti. Task turiga qarab:
 *  - web: HTML/CSS/JS (+ server.js) — jonli natija iframe'da
 *  - code / sql / config / qa: tanlangan til, PostgreSQL, DevOps fayllari yoki test yozish — Web Worker'da
 */
export default function SandboxWorkspace() {
  const { id = "" } = useParams();
  const [task, setTask] = useState<UserTask | null>(null);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    taskApi
      .get(id)
      .then((t) => {
        if (t.serverTime) setOffset(new Date(t.serverTime).getTime() - Date.now());
        setTask(t);
      })
      .catch((err) => setError(errorMessage(err, "Vazifa topilmadi")));
  }, [id]);

  if (error)
    return (
      <div className="p-6">
        <ErrorState message={error} />
      </div>
    );
  if (!task) return <PageLoader />;
  if (!task.sandbox?.enabled)
    return (
      <div className="p-6 flex flex-col gap-4 items-start">
        <ErrorState message="Bu task uchun kod muhiti yoqilmagan" />
        <Link to={`/dashboard/tasks/${task._id}`} className="text-sm font-semibold text-brand">
          Taskga qaytish
        </Link>
      </div>
    );
  return kindOf(task.sandbox) === "web" ? <WebWorkspace key={task._id} task={task} offset={offset} /> : <CodeWorkspace key={task._id} task={task} offset={offset} />;
}
