import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HiOutlineArrowPath, HiOutlineBeaker, HiOutlineDocumentText, HiOutlinePlay, HiOutlineServerStack } from "react-icons/hi2";
import type { SandboxCode, UserTask } from "../../types/type";
import { Button, ConfirmModal, cx } from "../ui";
import { useToast } from "../ui/toast";
import CodeEditor from "./CodeEditor";
import { starterCode, sameCode } from "./kinds";
import { BottomPanel, DeviceSwitch, PreviewFrame, TestList } from "./SandboxPanels";
import SubmitModal from "./SubmitModal";
import GuestSubmitModal from "./GuestSubmitModal";
import { track } from "../../lib/track";
import { SANDBOX_FILES, SERVER_FILE, type SandboxFiles } from "./runtime";
import { useSandboxRunner } from "./useSandboxRunner";
import { FileTabs, PaneSwitch, TaskBrief, WorkspaceHeader } from "./workspaceShared";
import { initialCode, useDraft, useRunShortcut, useWorkspaceExit } from "./workspaceState";

type FileKey = keyof SandboxFiles;
const toFiles = (c: SandboxCode): SandboxFiles => {
  const f: SandboxFiles = { html: c.html || "", css: c.css || "", js: c.js || "" };
  if (c.server !== undefined) f.server = c.server;
  return f;
};

/**
 * HTML/CSS/JS (+ server.js) muhiti: chapda shartlar/testlar, o'rtada muharrir, o'ngda jonli natija va konsol.
 * Kod brauzerda, izolyatsiyalangan iframe ichida ishlaydi — server resursi sarflanmaydi.
 */
export default function WebWorkspace({ task, offset, guest = false }: { task: UserTask; offset: number; guest?: boolean }) {
  const toast = useToast();
  const [code, setCode] = useState<SandboxCode>(() => initialCode(task, guest));
  const files = useMemo(() => toFiles(code), [code]);
  const hasServer = files.server !== undefined;
  const fileList = useMemo(() => (hasServer ? [...SANDBOX_FILES, SERVER_FILE] : SANDBOX_FILES), [hasServer]);
  const [active, setActive] = useState<FileKey>("html");
  const [side, setSide] = useState<"brief" | "tests">("brief");
  const mobileOnly = task.sandbox?.viewport === "mobile";
  const [device, setDevice] = useState<"desktop" | "mobile">(mobileOnly ? "mobile" : "desktop");
  const [bottom, setBottom] = useState<"console" | "tests">("console");
  const [mobilePane, setMobilePane] = useState<"brief" | "code" | "preview">("code");
  const [submitOpen, setSubmitOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const draft = useDraft(task, code, guest);
  const { onExpired, onSubmitted } = useWorkspaceExit(task);
  const tests = useMemo(() => task.sandbox?.tests || [], [task]);
  const runner = useSandboxRunner(files, tests);
  const { results, running, passed, setResults } = runner;

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
  const [tested, setTested] = useState<SandboxCode | null>(null);
  const { runTests: run } = runner;
  const runTests = useCallback(() => {
    setTested(code);
    run();
    if (guest) track("try_run", { taskId: task._id });
  }, [code, run, guest, task._id]);
  const openSubmit = () => {
    if (guest) track("try_submit", { taskId: task._id });
    setSubmitOpen(true);
  };
  useEffect(() => {
    if (guest) track("try_open", { taskId: task._id });
  }, [guest, task._id]);
  const stale = !!results && !!tested && !sameCode(tested, code);
  useRunShortcut(runTests);

  const meta = fileList.find((f) => f.key === active) || fileList[0];

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
          <TaskBrief task={task}>
            {hasServer && (
              <div className="flex gap-2.5 rounded-xl bg-mist p-3.5 text-[13px] text-ink-2">
                <HiOutlineServerStack size={18} className="shrink-0 mt-0.5 text-brand" />
                <p>
                  <b className="text-ink">server.js</b> — sizning backend'ingiz. Frontenddagi <code className="font-mono">fetch("/api/...")</code> so'rovlari undagi{" "}
                  <code className="font-mono">handle(request)</code> funksiyasiga keladi. Har bir so'rov konsolda ko'rinadi.
                </p>
              </div>
            )}
          </TaskBrief>
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
        <FileTabs files={fileList.map((f) => ({ name: f.name }))} active={meta.name} onChange={(n) => setActive(fileList.find((f) => f.name === n)!.key)} />
        {draft.editable && (
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
          file={meta.key}
          lang={meta.lang}
          value={files[meta.key] || ""}
          readOnly={!draft.editable}
          onChange={(v) => setCode((c) => (c[meta.key] === v ? c : { ...c, [meta.key]: v }))}
        />
      </div>
    </div>
  );

  const preview = (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between gap-2 px-3 h-11 border-b border-line shrink-0">
        <p className="text-[13px] font-semibold text-ink">Natija</p>
        {mobileOnly ? <span className="text-[12px] text-muted">Telefon ekrani · 375px</span> : <DeviceSwitch device={device} onChange={setDevice} />}
      </div>
      <PreviewFrame frame={runner.frame} doc={runner.doc} frameKey={runner.frameKey} device={device} />
      <BottomPanel logs={runner.logs} tests={tests} results={results} running={running} tab={bottom} onTab={setBottom} />
    </div>
  );

  return (
    <div className="h-dvh flex flex-col bg-paper text-ink">
      <WorkspaceHeader guest={guest} task={task} offset={offset} draft={draft} running={running} onRun={runTests} onSubmit={openSubmit} onExpired={onExpired} />
      <PaneSwitch
        panes={[
          { key: "brief", label: "Shartlar" },
          { key: "code", label: "Kod" },
          { key: "preview", label: "Natija" },
        ]}
        value={mobilePane}
        onChange={setMobilePane}
      />

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
            setMobilePane("preview");
            runTests();
          }}
        >
          <HiOutlinePlay size={16} /> Testlarni tekshirish
        </Button>
      </div>

      {guest ? (
        <GuestSubmitModal open={submitOpen} onClose={() => setSubmitOpen(false)} task={task} passed={passed} total={tests.length} tested={!!results && !stale} />
      ) : draft.editable && (
        <SubmitModal
          open={submitOpen}
          onClose={() => setSubmitOpen(false)}
          task={task}
          code={code}
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
          setCode(starterCode(task.sandbox));
          setResults(null);
          setConfirmReset(false);
        }}
      />
    </div>
  );
}
