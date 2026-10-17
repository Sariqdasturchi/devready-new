import { useState } from "react";
import { HiOutlineArrowTopRightOnSquare, HiOutlineMagnifyingGlass } from "react-icons/hi2";
import type { Task } from "../types/type";
import { DIFFICULTY, TRACKS } from "../lib/constants";
import { formatDuration } from "../lib/format";
import { Badge, Card, EmptyState, Input, Modal, Select } from "./ui";
import { stackLabel, testCount } from "./sandbox/kinds";

/** Tasklarni filtrlash/qidirish (mentor — faqat ko'rish) */
// eslint-disable-next-line react-refresh/only-export-components
export function useTaskFilters(tasks: Task[]) {
  const [search, setSearch] = useState("");
  const [track, setTrack] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const visible = tasks.filter(
    (t) => (!track || t.track === track) && (!difficulty || t.difficulty === difficulty) && t.title.toLowerCase().includes(search.trim().toLowerCase()),
  );
  const filters = (
    <div className="flex flex-col sm:flex-row gap-2">
      <div className="relative flex-1">
        <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Qidirish..." className="pl-9" />
      </div>
      <Select value={track} onChange={(e) => setTrack(e.target.value)} className="sm:w-44">
        <option value="">Barcha yo'nalishlar</option>
        {TRACKS.map((t) => (
          <option key={t}>{t}</option>
        ))}
      </Select>
      <Select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="sm:w-36">
        <option value="">Qiyinlik</option>
        {Object.entries(DIFFICULTY).map(([k, v]) => (
          <option key={k} value={k}>
            {v.label}
          </option>
        ))}
      </Select>
    </div>
  );
  return { visible, filters };
}

export function TaskViewModal({ task, onClose }: { task: Task | null; onClose: () => void }) {
  if (!task) return null;
  const diff = DIFFICULTY[task.difficulty] || DIFFICULTY.oson;
  return (
    <Modal open onClose={onClose} title={task.title} size="lg">
      <div className="flex flex-col gap-4 text-sm">
        <div className="flex flex-wrap gap-2">
          <Badge>{task.track}</Badge>
          <span className={`px-2 py-0.5 rounded-md border text-[11px] font-semibold ${diff.className}`}>{diff.label}</span>
          <Badge tone="warning">{task.xp} XP</Badge>
          <Badge tone="info">{formatDuration(task.estimatedTime)}</Badge>
          {task.sandbox?.enabled && <Badge tone="violet">Kod muhiti · {stackLabel(task.sandbox)} · {testCount(task.sandbox)} test</Badge>}
          {!task.sandbox?.enabled && task.deliverable === "design" && <Badge tone="violet">Dizayn · Figma</Badge>}
          {!task.isActive && <Badge tone="danger">Nofaol</Badge>}
        </div>
        <p className="text-ink-2 whitespace-pre-line">{task.description}</p>
        {task.content && <p className="text-ink-2 whitespace-pre-line border-t border-line pt-4">{task.content}</p>}
        {!!task.requirements?.length && (
          <ul className="list-disc pl-5 text-ink-2 space-y-1">
            {task.requirements.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        )}
        {[...(task.designTemplates || []), ...(task.exampleLink ? [{ title: "Namuna", url: task.exampleLink }] : [])].map((t, i) => (
          <a key={i} href={t.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-brand hover:underline">
            {t.title} <HiOutlineArrowTopRightOnSquare />
          </a>
        ))}
      </div>
    </Modal>
  );
}

export function TaskTile({ task, onClick, footer }: { task: Task; onClick: () => void; footer?: React.ReactNode }) {
  const diff = DIFFICULTY[task.difficulty] || DIFFICULTY.oson;
  return (
    <Card className="p-5 flex flex-col gap-3 hover:border-line transition-colors">
      <button type="button" onClick={onClick} className="text-left flex flex-col gap-3 cursor-pointer flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge>{task.track}</Badge>
          <span className={`px-2 py-0.5 rounded-md border text-[11px] font-semibold ${diff.className}`}>{diff.label}</span>
          {task.sandbox?.enabled ? <Badge tone="violet">{stackLabel(task.sandbox)}</Badge> : task.deliverable === "design" ? <Badge tone="violet">Dizayn</Badge> : null}
          {!task.isActive && <Badge tone="danger">Nofaol</Badge>}
        </div>
        <div>
          <p className="text-sm font-bold text-ink line-clamp-2">{task.title}</p>
          <p className="text-xs text-muted mt-1 line-clamp-2">{task.description}</p>
        </div>
        <p className="text-xs text-muted mt-auto">
          {task.xp} XP · {formatDuration(task.estimatedTime)}
          {task.submissionsCount !== undefined && ` · ${task.submissionsCount} urinish, ${task.approvedCount} qabul`}
        </p>
      </button>
      {footer}
    </Card>
  );
}

export function TasksEmpty() {
  return <EmptyState title="Tasklar topilmadi" />;
}
