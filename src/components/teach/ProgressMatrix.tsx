import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { GroupView, ProgressCell } from "../../types/type";
import { formatDate, timeAgo } from "../../lib/format";
import { Avatar, Select, cx } from "../ui";
import { CELL, cellText } from "./cells";

type Sort = "name" | "behind" | "score";

/**
 * Nazorat jadvali: qatorlar — talabalar, ustunlar — topshiriqlar.
 * Katakni bosish yechimni ochadi (baholash, kod, testlar). Talaba ustuni va sarlavha qotib turadi.
 */
export default function ProgressMatrix({ view, onOpen }: { view: GroupView; onOpen: (submissionId: string) => void }) {
  const [sort, setSort] = useState<Sort>("name");
  const { students, assignments, cells, studentStats } = view;

  const rows = useMemo(() => {
    const list = [...students];
    if (sort === "behind") list.sort((a, b) => (studentStats[b.id]?.missed || 0) - (studentStats[a.id]?.missed || 0) || (studentStats[a.id]?.submitted || 0) - (studentStats[b.id]?.submitted || 0));
    if (sort === "score") list.sort((a, b) => (studentStats[b.id]?.avgScore ?? -1) - (studentStats[a.id]?.avgScore ?? -1));
    return list;
  }, [students, sort, studentStats]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Legend />
        <label className="flex items-center gap-2 text-[13px] text-muted">
          Tartib
          <Select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="w-56" aria-label="Tartib">
            <option value="name">Ism bo'yicha</option>
            <option value="behind">Avval ortda qolganlar</option>
            <option value="score">O'rtacha ball bo'yicha</option>
          </Select>
        </label>
      </div>

      <div className="rounded-[18px] border border-line bg-surface overflow-auto max-h-[70vh]" data-testid="progress-matrix">
        <table className="border-separate border-spacing-0 text-[13px] min-w-full">
          <thead>
            <tr>
              <th className="sticky top-0 left-0 z-30 bg-surface border-b border-r border-line text-left font-semibold text-ink px-4 py-3 min-w-[200px] sm:min-w-[240px]">
                Talaba
              </th>
              {assignments.map((a) => {
                const closed = !a.open;
                return (
                  <th key={a.id} className="sticky top-0 z-20 bg-surface border-b border-line px-2 py-3 text-left font-normal align-bottom min-w-[128px] w-[150px]">
                    <span className="block text-[12.5px] font-semibold text-ink leading-snug line-clamp-2" title={a.task.title}>
                      {a.task.title.split(":")[0]}
                    </span>
                    <span className={cx("block text-[11.5px] mt-1", closed ? "text-muted" : "text-ink-2")}>
                      {closed ? "Yopilgan" : "Muddat"} {formatDate(a.dueAt)}
                    </span>
                    <span className="block text-[11.5px] text-muted tabular-nums">
                      {a.stats.submitted}/{a.stats.students} yubordi
                    </span>
                  </th>
                );
              })}
              <th className="sticky top-0 z-20 bg-surface border-b border-l border-line px-3 py-3 text-left font-semibold text-ink min-w-[110px]">Natija</th>
              {/* Qolgan kenglikni egallaydi — ustunlar o'z kengligida qoladi */}
              <th className="sticky top-0 z-20 bg-surface border-b border-line w-full" aria-hidden />
            </tr>
          </thead>
          <tbody>
            {rows.map((s, i) => {
              const st = studentStats[s.id];
              const last = i === rows.length - 1;
              return (
                <tr key={s.id} className="group">
                  <td className={cx("sticky left-0 z-10 bg-surface group-hover:bg-mist border-r border-line px-4 py-2.5", !last && "border-b")}>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar name={s.name} src={s.avatar} size={30} />
                      <div className="min-w-0">
                        {s.username ? (
                          <Link to={`/u/${s.username}`} target="_blank" className="block font-semibold text-ink truncate hover:text-brand">
                            {s.name}
                          </Link>
                        ) : (
                          <span className="block font-semibold text-ink truncate">{s.name}</span>
                        )}
                        <span className="block text-[11.5px] text-muted truncate">{st?.lastActivity ? `Faollik: ${timeAgo(st.lastActivity)}` : "Hali boshlamagan"}</span>
                      </div>
                    </div>
                  </td>
                  {assignments.map((a) => (
                    <td key={a.id} className={cx("px-2 py-2 group-hover:bg-mist/60", !last && "border-b border-line")}>
                      <Cell cell={cells[s.id]?.[a.id] || { status: "not_started" }} student={s.name} task={a.task.title} onOpen={onOpen} />
                    </td>
                  ))}
                  <td className={cx("border-l border-line px-3 py-2 group-hover:bg-mist/60 tabular-nums", !last && "border-b")}>
                    <span className="block font-semibold text-ink">
                      {st?.approved || 0}/{assignments.length}
                      <span className="font-normal text-muted"> qabul</span>
                    </span>
                    <span className="block text-[11.5px] text-muted">
                      {st?.avgScore !== null && st?.avgScore !== undefined ? `O'rtacha ${st.avgScore}` : "Ball yo'q"}
                      {st?.missed ? <span className="text-rose-600"> · {st.missed} qarz</span> : null}
                    </span>
                  </td>
                  <td className={cx("group-hover:bg-mist/60", !last && "border-b border-line")} aria-hidden />
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Cell({ cell, student, task, onOpen }: { cell: ProgressCell; student: string; task: string; onOpen: (id: string) => void }) {
  const cfg = CELL[cell.status];
  const tests = cell.total ? `${cell.passed}/${cell.total}` : null;
  const title = [student, task, cfg.hint, tests ? `testlar ${tests}` : "", cell.tries && cell.tries > 1 ? `${cell.tries}-urinish` : ""].filter(Boolean).join(" · ");
  const body = (
    <>
      <span className={cx("block leading-none", cell.score !== null && cell.score !== undefined ? "text-[17px] font-bold tabular-nums" : "text-[12px] font-semibold")}>
        {cell.needsTeacher && <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 mr-1 align-middle" aria-hidden />}
        {cellText(cell)}
      </span>
      {(tests || cell.status === "in_progress") && (
        <span className="block text-[10.5px] mt-1 opacity-80 tabular-nums">{tests ? `test ${tests}` : cell.hasDraft ? "kod yozmoqda" : "kod yo'q"}</span>
      )}
    </>
  );
  const cls = cx("w-full min-h-[46px] rounded-xl border px-2 py-1.5 text-center", cfg.className);
  if (!cell.submissionId) {
    return (
      <div className={cls} title={title}>
        {body}
      </div>
    );
  }
  return (
    <button type="button" onClick={() => onOpen(cell.submissionId!)} title={title} className={cx(cls, "cursor-pointer hover:ring-2 hover:ring-brand/30 focus-visible:outline-2 focus-visible:outline-brand")}>
      {body}
    </button>
  );
}

function Legend() {
  const items: (keyof typeof CELL)[] = ["approved", "review", "checking", "in_progress", "rejected", "missed"];
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] text-muted">
      {items.map((k) => (
        <span key={k} className="inline-flex items-center gap-1.5">
          <span className={cx("w-3 h-3 rounded border", CELL[k].className)} /> {CELL[k].hint}
        </span>
      ))}
    </div>
  );
}
