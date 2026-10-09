import { Link } from "react-router-dom";
import { HiOutlineClock, HiOutlineSparkles } from "react-icons/hi2";
import type { UserTask } from "../../types/type";
import { DIFFICULTY } from "../../lib/constants";
import { formatDuration } from "../../lib/format";
import { Badge, StatusBadge } from "../ui";
import Countdown from "./Countdown";

export type TaskType = UserTask;

export function TaskCard({ task }: { task: UserTask }) {
  const diff = DIFFICULTY[task.difficulty] || DIFFICULTY.oson;
  return (
    <Link
      to={`/dashboard/tasks/${task._id}`}
      className="group rounded-2xl border border-line bg-white hover:border-brand/30 hover:bg-white transition-all p-5 flex flex-col gap-4"
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <Badge>{task.track}</Badge>
          <span className={`px-2 py-0.5 rounded-md border text-[11px] font-semibold ${diff.className}`}>{diff.label}</span>
        </div>
        <StatusBadge status={task.status} />
      </div>
      <div className="flex-1">
        <h3 className="text-base font-bold text-ink group-hover:text-brand transition-colors line-clamp-2">{task.title}</h3>
        <p className="text-xs text-muted mt-1.5 line-clamp-2 leading-relaxed">{task.description}</p>
      </div>
      <div className="pt-3 border-t border-line flex items-center justify-between text-xs">
        <span className="inline-flex items-center gap-1 font-bold text-brand">
          <HiOutlineSparkles size={14} /> {task.status === "approved" ? `+${task.earnedXP}` : task.xp} XP
        </span>
        {task.status === "in_progress" && task.dueAt ? (
          <span className="inline-flex items-center gap-1 font-mono font-semibold text-brand">
            <HiOutlineClock size={14} /> <Countdown to={task.dueAt} />
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-muted">
            <HiOutlineClock size={14} /> {formatDuration(task.estimatedTime)}
          </span>
        )}
      </div>
    </Link>
  );
}

export default TaskCard;
