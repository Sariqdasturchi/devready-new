import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  HiOutlineArrowLeft,
  HiOutlineArrowPath,
  HiOutlineBeaker,
  HiOutlineCheckCircle,
  HiOutlineDocumentText,
  HiOutlineEye,
  HiOutlinePaperAirplane,
  HiOutlinePlay,
} from "react-icons/hi2";
import { errorMessage, submissionApi, taskApi } from "../../api/api";
import type { UserTask } from "../../types/type";
import { DIFFICULTY } from "../../lib/constants";
import { formatCountdown } from "../../lib/format";
import { invalidateCache } from "../../hooks/useCachedQuery";
import { Badge, Button, ConfirmModal, ErrorState, PageLoader, cx } from "../ui";
import { useToast } from "../ui/toast";
import ThemeToggle from "../ThemeToggle";
import { useCountdown } from "../user/Countdown";
import CodeEditor from "./CodeEditor";
import { BottomPanel, DeviceSwitch, PreviewFrame, TestList } from "./SandboxPanels";
import SubmitModal from "./SubmitModal";
import { SANDBOX_FILES, type SandboxFiles } from "./runtime";
import { useSandboxRunner } from "./useSandboxRunner";

const EMPTY: SandboxFiles = { html: "", css: "", js: "" };
const storeKey = (id: string) => `devready-sandbox:${id}`;
const same = (a: SandboxFiles, b: SandboxFiles) => a.html === b.html && a.css === b.css && a.js === b.js;
const asFiles = (v?: Partial<SandboxFiles> | null): SandboxFiles => ({ html: v?.html || "", css: v?.css || "", js: v?.js || "" });

/** Shu qurilmadagi qoralama: { files, at } */
function readLocal(id: string): { files: SandboxFiles; at: number } | null {
  try {
    const raw = localStorage.getItem(storeKey(id));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.files ? { files: asFiles(parsed.files), at: Number(parsed.at) || 0 } : { files: asFiles(parsed), at: 0 };
  } catch {
    return null;
  }
}
function writeLocal(id: string, files: SandboxFiles) {
  try {
    localStorage.setItem(storeKey(id), JSON.stringify({ files, at: Date.now() }));
    return true;
  } catch {
    return false;
  }
}
function clearLocal(id: string) {
  try {
    localStorage.removeItem(storeKey(id));
  } catch {
    /* e'tiborsiz */
  }
}

/** Boshlang'ich fayllar: shu qurilmadagi yoki serverdagi qoralamaning yangirog'i, bo'lmasa task shabloni */
function initialFiles(t: UserTask): SandboxFiles {
  const starter = asFiles(t.sandbox?.starter);
  const sub = t.submission;
  const server = sub?.code ? asFiles(sub.code) : null;
  if (t.status !== "in_progress") return server || starter;
  const local = t.submissionId ? readLocal(t.submissionId) : null;
  const serverAt = sub?.updatedAt ? new Date(sub.updatedAt).getTime() : 0;
  if (local && (!server || local.at >= serverAt)) return local.files;
  return server || starter;
}

type SaveState = "idle" | "saving" | "saved" | "local";

/**
 * Butun ekranli kod muhiti: chapda shartlar/testlar, o'rtada muharrir, o'ngda jonli natija va konsol.
 * Kod brauzerda, izolyatsiyalangan iframe ichida ishlaydi — server resursi sarflanmaydi.
 */
export default function SandboxWorkspace() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [task, setTask] = useState<UserTask | null>(null);
  const [error, setError] = useState("");
  const [offset, setOffset] = useState(0);
  const [files, setFiles] = useState<SandboxFiles>(EMPTY);
  const [active, setActive] = useState<keyof SandboxFiles>("html");
  const [side, setSide] = useState<"brief" | "tests">("brief");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [bottom, setBottom] = useState<"console" | "tests">("console");
  const [mobilePane, setMobilePane] = useState<"brief" | "code" | "preview">("code");
  const [save, setSave] = useState<SaveState>("idle");
  const [submitOpen, setSubmitOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const serverCopy = useRef<SandboxFiles>(EMPTY);

  const tests = useMemo(() => task?.sandbox?.tests || [], [task]);
  const runner = useSandboxRunner(files, tests);
  const { results, running, passed, setResults } = runner;
  const editable = task?.status === "in_progress" && !!task.submissionId;
  const subId = task?.submissionId || "";

  useEffect(() => {
    taskApi
      .get(id)
      .then((t) => {
        if (t.serverTime) setOffset(new Date(t.serverTime).getTime() - Date.now());
        const initial = initialFiles(t);
        serverCopy.current = asFiles(t.submission?.code);
        setFiles(initial);
        setTask(t);
      })
      .catch((err) => setError(errorMessage(err, "Vazifa topilmadi")));
  }, [id]);

  // Qoralama: darhol shu qurilmaga, 4 soniya tinch turgandan keyin serverga
  useEffect(() => {
    if (!editable) return;
    if (same(files, serverCopy.current)) return;
    const local = setTimeout(() => writeLocal(subId, files), 500);
    const remote = setTimeout(() => {
      setSave("saving");
      submissionApi
        .saveDraft(subId, files)
        .then(() => {
          serverCopy.current = files;
          setSave("saved");
        })
        .catch(() => setSave(writeLocal(subId, files) ? "local" : "idle"));
    }, 4000);
    return () => {
      clearTimeout(local);
      clearTimeout(remote);
    };
  }, [files, editable, subId]);

  // Test natijalari kelganda
  const lastResults = useRef(results);
  useEffect(() => {
    if (!results || results === lastResults.current) return;
    lastResults.current = results;
    setSide("tests");
    setBottom("tests");
    if (results.length && results.every((r) => r.ok)) toast.success(`Barcha ${results.length} ta test o'tdi!`);
  }, [results, toast]);

  // Kod o'zgarsa eski natija endi to'g'ri emas
  const [testedFiles, setTestedFiles] = useState<SandboxFiles | null>(null);
  const { runTests: run } = runner;
  const runTests = useCallback(() => {
    setTestedFiles(files);
    run();
  }, [files, run]);
  const stale = !!results && !!testedFiles && !same(testedFiles, files);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        runTests();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [runTests]);

  const onExpired = useCallback(() => {
    toast.error("Ajratilgan vaqt tugadi. Task bajarilmaganlar ro'yxatiga o'tkazildi");
    invalidateCache("user:tasks", "user:overview", "user:submissions");
    navigate(`/dashboard/tasks/${id}`, { replace: true });
  }, [id, navigate, toast]);

  const onSubmitted = () => {
    clearLocal(subId);
    invalidateCache("user:tasks", "user:overview", "user:submissions");
    navigate(`/dashboard/tasks/${id}`, { replace: true });
  };

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

  const diff = DIFFICULTY[task.difficulty] || DIFFICULTY.oson;
  const lang = SANDBOX_FILES.find((f) => f.key === active)!;
  const saveLabel = !editable
    ? "Faqat ko'rish"
    : { idle: "Qoralama avtomatik saqlanadi", saving: "Saqlanmoqda...", saved: "Saqlandi", local: "Faqat shu qurilmada saqlandi" }[save];

  const brief = (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex gap-1 p-2 border-b border-line">
        {(["brief", "tests"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setSide(k)}
            className={cx(
              "h-8 px-3 rounded-full text-[13px] font-medium cursor-pointer inline-flex items-center gap-1.5",
              side === k ? "bg-brand-tint text-brand" : "text-ink-2 hover:bg-mist",
            )}
          >
            {k === "brief" ? <HiOutlineDocumentText size={15} /> : <HiOutlineBeaker size={15} />}
            {k === "brief" ? "Shartlar" : `Testlar ${results ? `${passed}/${tests.length}` : tests.length}`}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-5">
        {side === "brief" ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              <Badge>{task.track}</Badge>
              <span className={`px-2 py-0.5 rounded-md border text-[11px] font-semibold ${diff.className}`}>{diff.label}</span>
              <Badge tone="info">{task.xp} XP</Badge>
            </div>
            <h1 className="text-lg font-bold text-ink leading-snug">{task.title}</h1>
            <p className="text-sm text-ink-2 leading-relaxed whitespace-pre-line">{task.description}</p>
            {task.content && <p className="text-sm text-ink-2 leading-relaxed whitespace-pre-line pt-3 border-t border-line">{task.content}</p>}
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
        ) : (
          <div className="flex flex-col gap-3">
            {stale && <p className="text-[12px] text-amber-800 bg-amber-50 rounded-lg px-3 py-2">Kod o'zgardi — natijani yangilash uchun qayta tekshiring.</p>}
            <TestList tests={tests} results={results} running={running} />
          </div>
        )}
      </div>
    </div>
  );

  const editor = (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between gap-2 px-2 border-b border-line h-11 shrink-0">
        <div className="flex gap-0.5 overflow-x-auto" role="tablist" aria-label="Fayllar">
          {SANDBOX_FILES.map((f) => (
            <button
              key={f.key}
              type="button"
              role="tab"
              aria-selected={active === f.key}
              onClick={() => setActive(f.key)}
              className={cx(
                "h-8 px-3 rounded-lg text-[13px] font-mono cursor-pointer whitespace-nowrap",
                active === f.key ? "bg-mist text-ink font-medium" : "text-muted hover:text-ink",
              )}
            >
              {f.name}
            </button>
          ))}
        </div>
        {editable && (
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="h-8 px-2.5 rounded-lg text-[12px] text-muted hover:text-ink hover:bg-mist inline-flex items-center gap-1 cursor-pointer shrink-0"
            title="Boshlang'ich kodga qaytarish"
          >
            <HiOutlineArrowPath size={14} /> <span className="hidden sm:inline">Qaytarish</span>
          </button>
        )}
      </div>
      <div className="flex-1 min-h-0">
        <CodeEditor
          file={active}
          lang={lang.lang}
          value={files[active]}
          readOnly={!editable}
          onChange={(v) => setFiles((f) => (f[active] === v ? f : { ...f, [active]: v }))}
        />
      </div>
    </div>
  );

  const preview = (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between gap-2 px-3 h-11 border-b border-line shrink-0">
        <p className="text-[13px] font-semibold text-ink">Natija</p>
        <DeviceSwitch device={device} onChange={setDevice} />
      </div>
      <PreviewFrame frame={runner.frame} doc={runner.doc} frameKey={runner.frameKey} device={device} />
      <BottomPanel logs={runner.logs} tests={tests} results={results} running={running} tab={bottom} onTab={setBottom} />
    </div>
  );

  return (
    <div className="h-dvh flex flex-col bg-paper text-ink">
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
          <p className={cx("hidden sm:block text-[11px] truncate", save === "local" ? "text-amber-700" : "text-muted")}>{saveLabel}</p>
        </div>
        {editable && task.dueAt && <Timer dueAt={task.dueAt} offset={offset} onEnd={onExpired} />}
        <span className="hidden sm:contents">
          <ThemeToggle />
          <Button variant="secondary" onClick={runTests} loading={running}>
            <HiOutlinePlay size={16} /> Tekshirish
          </Button>
        </span>
        {editable ? (
          <Button onClick={() => setSubmitOpen(true)} aria-label="Yechimni yuborish">
            <HiOutlinePaperAirplane size={16} /> <span className="hidden sm:inline">Yuborish</span>
          </Button>
        ) : (
          <span className="hidden md:inline-flex h-9 px-3 items-center gap-1.5 rounded-full bg-mist text-[13px] text-ink-2">
            <HiOutlineEye size={15} /> Yechim yuborilgan
          </span>
        )}
      </header>

      <div className="lg:hidden flex gap-1 p-2 border-b border-line bg-surface">
        {(["brief", "code", "preview"] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setMobilePane(p)}
            className={cx("flex-1 h-9 rounded-full text-[13px] font-medium cursor-pointer", mobilePane === p ? "bg-brand text-white" : "text-ink-2 bg-mist")}
          >
            {p === "brief" ? "Shartlar" : p === "code" ? "Kod" : "Natija"}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 lg:grid lg:grid-cols-[minmax(260px,0.8fr)_minmax(0,1.3fr)_minmax(0,1.2fr)]">
        <section className={cx("h-full min-h-0 bg-surface lg:border-r border-line", mobilePane === "brief" ? "block" : "hidden lg:block")}>{brief}</section>
        <section className={cx("h-full min-h-0 bg-surface lg:border-r border-line", mobilePane === "code" ? "block" : "hidden lg:block")}>{editor}</section>
        <section className={cx("h-full min-h-0 bg-surface", mobilePane === "preview" ? "block" : "hidden lg:block")}>{preview}</section>
      </div>

      <div className="sm:hidden p-2 border-t border-line bg-surface">
        <Button
          className="w-full"
          variant="secondary"
          loading={running}
          onClick={() => {
            runTests();
            setMobilePane("preview");
          }}
        >
          <HiOutlinePlay size={16} /> Testlarni tekshirish
        </Button>
      </div>

      {editable && (
        <SubmitModal
          open={submitOpen}
          onClose={() => setSubmitOpen(false)}
          task={task}
          code={files}
          passed={passed}
          total={tests.length}
          tested={!!results && !stale}
          onSubmitted={onSubmitted}
          onExpired={onExpired}
        />
      )}
      <ConfirmModal
        open={confirmReset}
        title="Boshlang'ich kodga qaytarish"
        text="Yozgan kodingiz o'chib, task shabloni qayta yuklanadi. Davom etasizmi?"
        confirmLabel="Qaytarish"
        danger
        onClose={() => setConfirmReset(false)}
        onConfirm={() => {
          setFiles(asFiles(task.sandbox?.starter));
          setResults(null);
          setConfirmReset(false);
        }}
      />
    </div>
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
