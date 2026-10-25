import { useState } from "react";
import { Link } from "react-router-dom";
import { HiOutlineAcademicCap } from "react-icons/hi2";
import { orgApi } from "../../api/api";
import { useCachedQuery } from "../../hooks/useCachedQuery";
import { useOrgMe } from "../../hooks/useOrgMe";
import { formatDate } from "../../lib/format";
import { Card, cx } from "../ui";
import { timeLeft } from "../teach/cells";

/** Talaba bosh sahifasida: guruhdan kelgan, hali yuborilmagan topshiriqlar (eng yaqin muddat birinchi) */
export default function GroupDeadlines() {
  const me = useOrgMe();
  const hasGroups = !!me.data?.studentGroups;
  const q = useCachedQuery("org:student", orgApi.student, { staleTime: 10_000, enabled: hasGroups });
  const [now] = useState(Date.now);
  if (!hasGroups || !q.data) return null;

  const todo = q.data.groups
    .flatMap((g) => g.assignments.filter((a) => a.open && ["not_started", "in_progress", "rejected", "expired"].includes(a.my.status)).map((a) => ({ ...a, group: g.name })))
    .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
  if (!todo.length) return null;

  return (
    <Card className="p-5 border-brand/30">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="flex items-center gap-2 text-[15px] font-bold text-ink">
          <HiOutlineAcademicCap className="text-brand" size={20} /> Guruh topshiriqlari
        </h2>
        <Link to="/dashboard/groups" className="text-[13px] font-semibold text-brand hover:underline">
          Hammasi ({todo.length})
        </Link>
      </div>
      <ul className="flex flex-col divide-y divide-line">
        {todo.slice(0, 3).map((a) => {
          const soon = new Date(a.dueAt).getTime() - now < 24 * 3600000;
          return (
            <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink truncate">{a.task.title}</p>
                <p className="text-xs text-muted">
                  {a.group} · {a.my.status === "in_progress" ? "boshlangan" : a.my.status === "not_started" ? "boshlanmagan" : "qayta urinish mumkin"}
                </p>
              </div>
              <span className={cx("text-xs font-semibold whitespace-nowrap", soon ? "text-amber-700" : "text-ink-2")} title={formatDate(a.dueAt, true)}>
                {timeLeft(a.dueAt, now)} qoldi
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
