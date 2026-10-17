import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { HiOutlineArrowLeft, HiOutlineCheckCircle, HiOutlineEye, HiOutlinePaperAirplane, HiOutlinePlay } from "react-icons/hi2";
import type { UserTask } from "../../types/type";
import type { SaveState } from "./workspaceState";
import { DIFFICULTY } from "../../lib/constants";
import { formatCountdown } from "../../lib/format";
import { Badge, Button, cx } from "../ui";
import ThemeToggle from "../ThemeToggle";
import { useCountdown } from "../user/Countdown";
import { stackLabel } from "./kinds";

/* ───────── Yuqori panel ───────── */

export function WorkspaceHeader({
  task,
  offset,
  draft,
  running,
  onRun,
  onSubmit,
  onExpired,
  extra,
}: {
  task: UserTask;
  offset: number;
  draft: { editable: boolean; save: SaveState; label: string };
  running: boolean;
  onRun: () => void;
  onSubmit: () => void;
  onExpired: () => void;
  extra?: ReactNode;
}) {
  return (
    <header className="h-14 shrink-0 border-b border-line bg-surface flex items-center gap-3 px-3 sm:px-4">
      <Link
        to={`/dashboard/tasks/${task._id}`}
        className="h-9 w-9 shrink-0 inline-flex items-center justify-center rounded-full text-ink-2 hover:bg-mist"
        aria-label="Taskga qaytish"
      >
        <HiOutlineArrowLeft size={18} />
      </Link>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-semibold text-ink truncate">{task.title}</p>
        <p className={cx("hidden sm:block text-[11px] truncate", draft.save === "local" ? "text-amber-700" : "text-muted")}>{draft.label}</p>
      </div>
      {extra}
      {draft.editable && task.dueAt && <Timer dueAt={task.dueAt} offset={offset} onEnd={onExpired} />}
      <span className="hidden sm:contents">
        <ThemeToggle />
        <Button variant="secondary" onClick={onRun} loading={running}>
          <HiOutlinePlay size={16} /> Tekshirish
        </Button>
      </span>
      {draft.editable ? (
        <Button onClick={onSubmit} aria-label="Yechimni yuborish">
          <HiOutlinePaperAirplane size={16} /> <span className="hidden sm:inline">Yuborish</span>
        </Button>
      ) : (
        <span className="hidden md:inline-flex h-9 px-3 items-center gap-1.5 rounded-full bg-mist text-[13px] text-ink-2">
          <HiOutlineEye size={15} /> Yechim yuborilgan
        </span>
      )}
    </header>
  );
}

function Timer({ dueAt, offset, onEnd }: { dueAt: string; offset: number; onEnd: () => void }) {
  const left = useCountdown(dueAt, offset, onEnd);
  const urgent = left < 15 * 60;
  return (
    <span
      className={cx(
        "hidden md:inline-flex h-9 px-3 items-center rounded-full font-mono text-[13px] font-semibold",
        urgent ? "bg-rose-50 text-rose-600" : "bg-brand-tint text-brand",
      )}
      title="Qolgan vaqt"
    >
      {formatCountdown(left)}
    </span>
  );
}

/* ───────── Shartlar paneli ───────── */

export function TaskBrief({ task, children }: { task: UserTask; children?: ReactNode }) {
  const diff = DIFFICULTY[task.difficulty] || DIFFICULTY.oson;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <Badge>{task.track}</Badge>
        <span className={`px-2 py-0.5 rounded-md border text-[11px] font-semibold ${diff.className}`}>{diff.label}</span>
        <Badge tone="info">{task.xp} XP</Badge>
        <Badge tone="violet">{stackLabel(task.sandbox)}</Badge>
      </div>
      <h1 className="text-lg font-bold text-ink leading-snug">{task.title}</h1>
      <p className="text-sm text-ink-2 leading-relaxed whitespace-pre-line">{task.description}</p>
      {task.content && <p className="text-sm text-ink-2 leading-relaxed whitespace-pre-line pt-3 border-t border-line">{task.content}</p>}
      {children}
      {!!task.requirements?.length && (
        <ul className="flex flex-col gap-2 pt-3 border-t border-line">
          {task.requirements.map((r) => (
            <li key={r} className="flex gap-2 text-sm text-ink-2">
              <HiOutlineCheckCircle className="text-brand shrink-0 mt-0.5" size={17} /> {r}
            </li>
          ))}
        </ul>
      )}
      <p className="hidden lg:block text-[12px] text-muted pt-3 border-t border-line">
        <kbd className="px-1.5 py-0.5 rounded border border-line bg-mist font-mono text-[11px]">Ctrl</kbd> +{" "}
        <kbd className="px-1.5 py-0.5 rounded border border-line bg-mist font-mono text-[11px]">Enter</kbd> — testlarni tekshirish
      </p>
    </div>
  );
}

/** Kichik ekranlarda panellar orasida o'tish */
export function PaneSwitch<T extends string>({ panes, value, onChange }: { panes: { key: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="lg:hidden flex gap-1 p-2 border-b border-line bg-surface">
      {panes.map((p) => (
        <button
          key={p.key}
          type="button"
          onClick={() => onChange(p.key)}
          className={cx("flex-1 h-9 rounded-full text-[13px] font-medium cursor-pointer", value === p.key ? "bg-brand text-white" : "text-ink-2 bg-mist")}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

/** Fayl tablari */
export function FileTabs({ files, active, onChange }: { files: { name: string; given?: boolean }[]; active: string; onChange: (name: string) => void }) {
  return (
    <div className="flex gap-0.5 overflow-x-auto" role="tablist" aria-label="Fayllar">
      {files.map((f) => (
        <button
          key={f.name}
          type="button"
          role="tab"
          aria-selected={active === f.name}
          onClick={() => onChange(f.name)}
          title={f.given ? "Platforma bergan fayl — faqat o'qish uchun" : undefined}
          className={cx(
            "h-8 px-3 rounded-lg text-[13px] font-mono cursor-pointer whitespace-nowrap",
            active === f.name ? "bg-mist text-ink font-medium" : "text-muted hover:text-ink",
          )}
        >
          {f.name}
          {f.given && <span className="ml-1.5 text-[10px] font-sans text-muted">faqat o'qish</span>}
        </button>
      ))}
    </div>
  );
}
