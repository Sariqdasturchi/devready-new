import type { Submission } from "../../types/type";
import { timeAgo } from "../../lib/format";
import { Avatar, Badge, StatusBadge } from "../ui";

export default function SubmissionRow({ s, onOpen, showMentor }: { s: Submission; onOpen: () => void; showMentor?: boolean }) {
  const student = typeof s.userId === "object" ? s.userId : null;
  const task = typeof s.taskId === "object" ? s.taskId : null;
  const mentor = typeof s.mentorId === "object" ? s.mentorId : null;
  return (
    <button type="button" onClick={onOpen} className="w-full text-left flex items-center gap-4 px-4 sm:px-5 py-3.5 hover:bg-mist cursor-pointer">
      <Avatar name={student?.fullName} src={student?.avatar} size={36} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink truncate">{task?.title || "O'chirilgan task"}</p>
        <p className="text-xs text-muted truncate">
          {student?.fullName || "—"} · {timeAgo(s.submittedAt || s.updatedAt || s.startedAt)}
          {showMentor && ` · ${s.reviewMethod === "ai" ? "AI" : mentor ? mentor.fullName : "Mentor tayinlanmagan"}`}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {task?.track && <span className="hidden md:inline"><Badge>{task.track}</Badge></span>}
        {(s.status === "approved" || s.status === "rejected") && <span className="text-xs font-bold text-ink">{s.reviewScore}/100</span>}
        <StatusBadge status={s.status} />
      </div>
    </button>
  );
}
