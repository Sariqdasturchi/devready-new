import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { HiOutlinePlay, HiOutlineXMark } from "react-icons/hi2";
import { submissionApi } from "../../api/api";
import type { SandboxCode, Submission } from "../../types/type";
import { Button, cx } from "../ui";
import CodeEditor from "./CodeEditor";
import { BottomPanel, DeviceSwitch, PreviewFrame } from "./SandboxPanels";
import { SANDBOX_FILES, type SandboxFiles, type SandboxTest } from "./runtime";
import { useSandboxRunner } from "./useSandboxRunner";

/**
 * Mentor / superadmin uchun: talabaning kod muhitidagi yechimini to'liq ekranda ko'rish,
 * natijani ishga tushirish va testlarni qayta tekshirish (kod faqat o'qish uchun).
 */
export default function CodeReviewOverlay({ submission, onClose }: { submission: Submission; onClose: () => void }) {
  const code = submission.code as SandboxCode;
  const files = useMemo<SandboxFiles>(() => ({ html: code.html || "", css: code.css || "", js: code.js || "" }), [code]);
  const [tests, setTests] = useState<SandboxTest[]>([]);
  const [active, setActive] = useState<keyof SandboxFiles>("html");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [pane, setPane] = useState<"code" | "preview">("code");
  const [bottom, setBottom] = useState<"console" | "tests">("console");
  const runner = useSandboxRunner(files, tests, { live: false });
  const task = typeof submission.taskId === "object" ? submission.taskId : null;
  const student = typeof submission.userId === "object" ? submission.userId : null;

  // Testlar task ichida — to'liq submission'dan olamiz
  useEffect(() => {
    submissionApi
      .get(submission._id)
      .then((s) => {
        const t = typeof s.taskId === "object" ? s.taskId : null;
        setTests(t?.sandbox?.tests || []);
      })
      .catch(() => setTests([]));
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

  useEffect(() => {
    if (runner.results) setBottom("tests");
  }, [runner.results]);

  const lang = SANDBOX_FILES.find((f) => f.key === active)!;
  const reported = submission.testResults;

  return createPortal(
    <div className="fixed inset-0 z-[110] bg-paper text-ink flex flex-col" role="dialog" aria-modal="true" aria-label="Talaba kodi">
      <header className="h-14 shrink-0 border-b border-line bg-surface flex items-center gap-3 px-3 sm:px-4">
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold text-ink truncate">{task?.title || "Talaba kodi"}</p>
          <p className="text-[11px] text-muted truncate">
            {student?.fullName}
            {reported?.total ? ` · yuborishda ${reported.passed}/${reported.total} test o'tgan` : " · testlar ishga tushirilmagan"}
          </p>
        </div>
        {!!tests.length && (
          <Button variant="secondary" onClick={runner.runTests} loading={runner.running}>
            <HiOutlinePlay size={16} /> <span className="hidden sm:inline">Testlarni tekshirish</span>
          </Button>
        )}
        <button type="button" onClick={onClose} className="h-9 w-9 inline-flex items-center justify-center rounded-full text-ink-2 hover:bg-mist cursor-pointer" aria-label="Yopish">
          <HiOutlineXMark size={20} />
        </button>
      </header>

      <div className="lg:hidden flex gap-1 p-2 border-b border-line bg-surface">
        {(["code", "preview"] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPane(p)}
            className={cx("flex-1 h-9 rounded-full text-[13px] font-medium cursor-pointer", pane === p ? "bg-brand text-white" : "text-ink-2 bg-mist")}
          >
            {p === "code" ? "Kod" : "Natija"}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 lg:grid lg:grid-cols-2">
        <section className={cx("h-full min-h-0 bg-surface lg:border-r border-line flex-col", pane === "code" ? "flex" : "hidden lg:flex")}>
          <div className="flex gap-0.5 px-2 h-11 items-center border-b border-line shrink-0" role="tablist" aria-label="Fayllar">
            {SANDBOX_FILES.map((f) => (
              <button
                key={f.key}
                type="button"
                role="tab"
                aria-selected={active === f.key}
                onClick={() => setActive(f.key)}
                className={cx("h-8 px-3 rounded-lg text-[13px] font-mono cursor-pointer", active === f.key ? "bg-mist text-ink font-medium" : "text-muted hover:text-ink")}
              >
                {f.name}
                <span className="ml-1.5 text-[11px] text-muted">{files[f.key].split("\n").length}</span>
              </button>
            ))}
          </div>
          <div className="flex-1 min-h-0">
            <CodeEditor key={submission._id} file={active} lang={lang.lang} value={files[active]} readOnly />
          </div>
        </section>
        <section className={cx("h-full min-h-0 bg-surface flex-col", pane === "preview" ? "flex" : "hidden lg:flex")}>
          <div className="flex items-center justify-between gap-2 px-3 h-11 border-b border-line shrink-0">
            <p className="text-[13px] font-semibold text-ink">Natija</p>
            <DeviceSwitch device={device} onChange={setDevice} />
          </div>
          <PreviewFrame frame={runner.frame} doc={runner.doc} frameKey={runner.frameKey} device={device} />
          <BottomPanel logs={runner.logs} tests={tests} results={runner.results} running={runner.running} tab={bottom} onTab={setBottom} />
        </section>
      </div>
    </div>,
    document.body,
  );
}
