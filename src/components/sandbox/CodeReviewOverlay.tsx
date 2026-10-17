import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { HiOutlinePlay, HiOutlineXMark } from "react-icons/hi2";
import { submissionApi } from "../../api/api";
import type { SandboxCode, Submission, TaskSandbox } from "../../types/type";
import { Button, cx } from "../ui";
import CodeEditor from "./CodeEditor";
import { codeFiles, kindOf, testTitles } from "./kinds";
import { BottomPanel, ConsoleView, DeviceSwitch, PreviewFrame, SqlTable, TestList } from "./SandboxPanels";
import { runChecks } from "./runChecks";
import type { RunOutput } from "./runners/host";
import { LANG_LABEL, type CodeLang } from "./runners/types";
import type { SandboxFiles } from "./runtime";
import { useSandboxRunner } from "./useSandboxRunner";
import { FileTabs } from "./workspaceShared";

/**
 * Mentor / superadmin uchun: talabaning kod muhitidagi yechimini to'liq ekranda ko'rish
 * va testlarni qayta ishga tushirish (kod faqat o'qish uchun). Barcha turlar: web, til, SQL, DevOps, QA.
 */
export default function CodeReviewOverlay({ submission, onClose }: { submission: Submission; onClose: () => void }) {
  const code = submission.code as SandboxCode;
  const [sandbox, setSandbox] = useState<TaskSandbox | null | undefined>(undefined);
  const task = typeof submission.taskId === "object" ? submission.taskId : null;
  const student = typeof submission.userId === "object" ? submission.userId : null;

  // Testlar task ichida — to'liq submission'dan olamiz
  useEffect(() => {
    submissionApi
      .get(submission._id)
      .then((s) => setSandbox(s.taskId && typeof s.taskId === "object" ? s.taskId.sandbox || null : null))
      .catch(() => setSandbox(null));
  }, [submission._id]);

  // Escape faqat shu oynani yopadi (ostidagi baholash oynasini emas)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  const reported = submission.testResults;
  const kind = sandbox ? kindOf(sandbox) : code.language || code.files ? "code" : "web";
  const subtitle = [
    student?.fullName,
    code.language && code.language !== "sql" ? LANG_LABEL[code.language as CodeLang] || code.language : null,
    reported?.total ? `yuborishda ${reported.passed}/${reported.total} test o'tgan` : "testlar ishga tushirilmagan",
  ]
    .filter(Boolean)
    .join(" · ");

  return createPortal(
    <div className="fixed inset-0 z-[110] bg-paper text-ink flex flex-col" role="dialog" aria-modal="true" aria-label="Talaba kodi">
      {sandbox === undefined ? (
        <Header title={task?.title} subtitle={subtitle} onClose={onClose} />
      ) : kind === "web" ? (
        <WebReview code={code} sandbox={sandbox} title={task?.title} subtitle={subtitle} onClose={onClose} />
      ) : (
        <CheckReview code={code} sandbox={sandbox!} title={task?.title} subtitle={subtitle} onClose={onClose} />
      )}
    </div>,
    document.body,
  );
}

function Header({ title, subtitle, onClose, action }: { title?: string; subtitle: string; onClose: () => void; action?: ReactNode }) {
  return (
    <header className="h-14 shrink-0 border-b border-line bg-surface flex items-center gap-3 px-3 sm:px-4">
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-semibold text-ink truncate">{title || "Talaba kodi"}</p>
        <p className="text-[11px] text-muted truncate">{subtitle}</p>
      </div>
      {action}
      <button type="button" onClick={onClose} className="h-9 w-9 inline-flex items-center justify-center rounded-full text-ink-2 hover:bg-mist cursor-pointer" aria-label="Yopish">
        <HiOutlineXMark size={20} />
      </button>
    </header>
  );
}

function PaneTabs({ value, onChange, labels }: { value: "code" | "result"; onChange: (v: "code" | "result") => void; labels: [string, string] }) {
  return (
    <div className="lg:hidden flex gap-1 p-2 border-b border-line bg-surface">
      {(["code", "result"] as const).map((p, i) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          className={cx("flex-1 h-9 rounded-full text-[13px] font-medium cursor-pointer", value === p ? "bg-brand text-white" : "text-ink-2 bg-mist")}
        >
          {labels[i]}
        </button>
      ))}
    </div>
  );
}

function ReadOnlyFiles({ files }: { files: ReturnType<typeof codeFiles> }) {
  const [active, setActive] = useState(files[0]?.name || "");
  const current = files.find((f) => f.name === active) || files[0];
  return (
    <>
      <div className="flex px-2 h-11 items-center border-b border-line shrink-0">
        <FileTabs files={files} active={current?.name || ""} onChange={setActive} />
      </div>
      <div className="flex-1 min-h-0">{current && <CodeEditor key={current.name} file={current.name} lang={current.lang} value={current.value} readOnly />}</div>
    </>
  );
}

function WebReview({ code, sandbox, title, subtitle, onClose }: { code: SandboxCode; sandbox: TaskSandbox | null; title?: string; subtitle: string; onClose: () => void }) {
  const files = useMemo<SandboxFiles>(() => {
    const f: SandboxFiles = { html: code.html || "", css: code.css || "", js: code.js || "" };
    if (code.server !== undefined) f.server = code.server;
    return f;
  }, [code]);
  const tests = useMemo(() => sandbox?.tests || [], [sandbox]);
  const [device, setDevice] = useState<"desktop" | "mobile">(sandbox?.viewport === "mobile" ? "mobile" : "desktop");
  const [pane, setPane] = useState<"code" | "result">("code");
  const [bottom, setBottom] = useState<"console" | "tests">("console");
  const runner = useSandboxRunner(files, tests, { live: false });
  useEffect(() => {
    if (runner.results) setBottom("tests");
  }, [runner.results]);

  return (
    <>
      <Header
        title={title}
        subtitle={subtitle}
        onClose={onClose}
        action={
          !!tests.length && (
            <Button variant="secondary" onClick={runner.runTests} loading={runner.running}>
              <HiOutlinePlay size={16} /> <span className="hidden sm:inline">Testlarni tekshirish</span>
            </Button>
          )
        }
      />
      <PaneTabs value={pane} onChange={setPane} labels={["Kod", "Natija"]} />
      <div className="flex-1 min-h-0 lg:grid lg:grid-cols-2">
        <section className={cx("h-full min-h-0 bg-surface lg:border-r border-line flex-col", pane === "code" ? "flex" : "hidden lg:flex")}>
          <ReadOnlyFiles files={codeFiles(sandbox, code)} />
        </section>
        <section className={cx("h-full min-h-0 bg-surface flex-col", pane === "result" ? "flex" : "hidden lg:flex")}>
          <div className="flex items-center justify-between gap-2 px-3 h-11 border-b border-line shrink-0">
            <p className="text-[13px] font-semibold text-ink">Natija</p>
            <DeviceSwitch device={device} onChange={setDevice} />
          </div>
          <PreviewFrame frame={runner.frame} doc={runner.doc} frameKey={runner.frameKey} device={device} />
          <BottomPanel logs={runner.logs} tests={tests} results={runner.results} running={runner.running} tab={bottom} onTab={setBottom} />
        </section>
      </div>
    </>
  );
}

function CheckReview({ code, sandbox, title, subtitle, onClose }: { code: SandboxCode; sandbox: TaskSandbox; title?: string; subtitle: string; onClose: () => void }) {
  const [pane, setPane] = useState<"code" | "result">("code");
  const [tab, setTab] = useState<"tests" | "console" | "table">("tests");
  const [output, setOutput] = useState<RunOutput | null>(null);
  const [running, setRunning] = useState(false);
  const tests = useMemo(() => testTitles(sandbox), [sandbox]);
  const isSql = kindOf(sandbox) === "sql";

  const run = async () => {
    setRunning(true);
    setTab("tests");
    setPane("result");
    setOutput(await runChecks(sandbox, code));
    setRunning(false);
  };

  return (
    <>
      <Header
        title={title}
        subtitle={subtitle}
        onClose={onClose}
        action={
          <Button variant="secondary" onClick={run} loading={running}>
            <HiOutlinePlay size={16} /> <span className="hidden sm:inline">Testlarni tekshirish</span>
          </Button>
        }
      />
      <PaneTabs value={pane} onChange={setPane} labels={["Kod", "Testlar"]} />
      <div className="flex-1 min-h-0 lg:grid lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <section className={cx("h-full min-h-0 bg-surface lg:border-r border-line flex-col", pane === "code" ? "flex" : "hidden lg:flex")}>
          <ReadOnlyFiles files={codeFiles(sandbox, code)} />
        </section>
        <section className={cx("h-full min-h-0 bg-surface flex-col", pane === "result" ? "flex" : "hidden lg:flex")}>
          <div className="flex gap-1 px-2 h-11 items-center border-b border-line shrink-0">
            {(["tests", ...(isSql ? ["table"] : []), "console"] as ("tests" | "console" | "table")[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={cx("h-8 px-3 rounded-lg text-[13px] font-medium cursor-pointer", tab === t ? "bg-mist text-ink" : "text-muted hover:text-ink")}
              >
                {t === "tests" ? `Testlar${output ? ` ${output.results.filter((r) => r.ok).length}/${tests.length}` : ""}` : t === "table" ? "Jadval" : "Konsol"}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto">
            {tab === "tests" ? (
              <div className="p-4">
                <TestList tests={tests} results={output?.results || null} running={running} />
              </div>
            ) : tab === "table" ? (
              <SqlTable preview={output?.preview ?? null} ran={!!output} />
            ) : (
              <ConsoleView logs={output?.logs || []} />
            )}
          </div>
        </section>
      </div>
    </>
  );
}
