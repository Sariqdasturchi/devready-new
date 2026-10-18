import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HiOutlineArrowPath, HiOutlineBeaker, HiOutlineCommandLine, HiOutlineDocumentText, HiOutlinePlay, HiOutlineTableCells } from "react-icons/hi2";
import type { CodeLanguage, SandboxCode, UserTask } from "../../types/type";
import { Button, ConfirmModal, cx } from "../ui";
import { useToast } from "../ui/toast";
import CodeEditor from "./CodeEditor";
import { codeFiles, defaultLanguage, kindOf, sameCode, starterCode, testTitles } from "./kinds";
import { ConsoleView, SqlTable, TestList } from "./SandboxPanels";
import SubmitModal from "./SubmitModal";
import GuestSubmitModal from "./GuestSubmitModal";
import { track } from "../../lib/track";
import { warmPython, type RunOutput } from "./runners/host";
import { runChecks } from "./runChecks";
import { LANG_LABEL } from "./runners/types";
import { FileTabs, PaneSwitch, TaskBrief, WorkspaceHeader } from "./workspaceShared";
import { initialCode, useDraft, useRunShortcut, useWorkspaceExit } from "./workspaceState";

type OutTab = "tests" | "console" | "table";

/**
 * Brauzerda ishlaydigan "server'siz" muhit: funksiya/API tasklari (JS, TS, Python), SQL (PostgreSQL),
 * DevOps fayllari va QA (talaba test yozadi). Kod Web Worker'da ishlaydi — sahifa qotib qolmaydi,
 * cheksiz sikl bo'lsa worker to'xtatiladi.
 */
export default function CodeWorkspace({ task, offset, guest = false }: { task: UserTask; offset: number; guest?: boolean }) {
  const toast = useToast();
  const sb = task.sandbox!;
  const kind = kindOf(sb);
  const [code, setCode] = useState<SandboxCode>(() => initialCode(task, guest));
  const files = useMemo(() => codeFiles(sb, code), [sb, code]);
  const [active, setActive] = useState(files[0]?.name || "");
  const [side, setSide] = useState<"brief" | "tests">("brief");
  const [outTab, setOutTab] = useState<OutTab>("tests");
  const [mobilePane, setMobilePane] = useState<"brief" | "code" | "result">("code");
  const [submitOpen, setSubmitOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [pendingLang, setPendingLang] = useState<CodeLanguage | null>(null);
  const [output, setOutput] = useState<RunOutput | null>(null);
  const [tested, setTested] = useState<SandboxCode | null>(null);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [pyState, setPyState] = useState<"idle" | "loading" | "ready" | "error">("idle");

  const draft = useDraft(task, code, guest);
  const { onExpired, onSubmitted } = useWorkspaceExit(task);
  const tests = useMemo(() => testTitles(sb), [sb]);
  const results = output?.results || null;
  const passed = results?.filter((r) => r.ok).length ?? 0;
  const stale = !!results && !!tested && !sameCode(tested, code);
  const language = (code.language || defaultLanguage(sb)) as CodeLanguage;

  // Python tanlansa — muhitni oldindan yuklab qo'yamiz (birinchi marta bir necha soniya)
  useEffect(() => {
    if (kind !== "code" || language !== "python" || pyState === "ready" || pyState === "loading") return;
    setPyState("loading");
    warmPython().then((ok) => setPyState(ok ? "ready" : "error"));
  }, [kind, language, pyState]);

  const run = useCallback(async () => {
    if (running) return;
    setRunning(true);
    setProgress(0);
    setSide("tests");
    setOutTab("tests");
    const snapshot = code;
    if (guest) track("try_run", { taskId: task._id });
    const out = await runChecks(sb, snapshot, setProgress);
    if (kind === "code" && language === "python" && !out.fatal) setPyState("ready");
    setOutput(out);
    setTested(snapshot);
    setRunning(false);
    const ok = out.results.filter((r) => r.ok).length;
    if (out.results.length && ok === out.results.length) toast.success(`Barcha ${ok} ta test o'tdi!`);
    else if (kind === "sql" && out.preview && ok === 0) setOutTab("table");
  }, [running, code, kind, language, sb, toast, guest, task._id]);
  useRunShortcut(run);
  const openSubmit = () => {
    if (guest) track("try_submit", { taskId: task._id });
    setSubmitOpen(true);
  };
  useEffect(() => {
    if (guest) track("try_open", { taskId: task._id });
  }, [guest, task._id]);

  const current = files.find((f) => f.name === active) || files[0];
  const onEdit = (v: string) => {
    if (!current || current.given) return;
    setCode((c) => {
      if (kind === "config") {
        const list = (c.files || []).map((f) => (f.name === current.name ? { ...f, content: v } : f));
        return sameCode({ files: list }, c) ? c : { ...c, files: list };
      }
      return c.main === v ? c : { ...c, main: v };
    });
  };

  // Til almashtirish: har til uchun yozilgan kod shu sessiyada eslab qolinadi
  const perLang = useRef<Partial<Record<CodeLanguage, string>>>({});
  const switchLang = (next: CodeLanguage) => {
    perLang.current[language] = code.main || "";
    const restored = perLang.current[next];
    setCode({ language: next, main: restored ?? sb.starters?.[next] ?? "" });
    setOutput(null);
    setPendingLang(null);
    setActive(codeFiles(sb, { language: next, main: "" })[0].name);
  };
  const askLang = (next: CodeLanguage) => {
    if (next === language) return;
    const untouched = !code.main?.trim() || code.main === sb.starters?.[language] || perLang.current[next] !== undefined;
    if (untouched) switchLang(next);
    else setPendingLang(next);
  };

  const langs: CodeLanguage[] = sb.languages?.length ? sb.languages : ["javascript", "typescript", "python"];

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
            <KindHint task={task} />
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
        <div className="flex items-center gap-2 min-w-0">
          {kind === "code" && (
            <label className="shrink-0">
              <span className="sr-only">Dasturlash tili</span>
              <select
                value={language}
                onChange={(e) => askLang(e.target.value as CodeLanguage)}
                disabled={!draft.editable}
                className="h-8 pl-2.5 pr-7 rounded-lg border border-line bg-surface text-[13px] font-medium text-ink cursor-pointer"
              >
                {langs.map((l) => (
                  <option key={l} value={l}>
                    {LANG_LABEL[l]}
                  </option>
                ))}
              </select>
            </label>
          )}
          <FileTabs files={files} active={current?.name || ""} onChange={setActive} />
        </div>
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
      {kind === "code" && language === "python" && pyState !== "ready" && pyState !== "idle" && (
        <p className={cx("px-3 py-1.5 text-[12px] border-b border-line", pyState === "error" ? "text-rose-600 bg-rose-50" : "text-muted bg-mist")}>
          {pyState === "loading" ? "Python muhiti yuklanmoqda — faqat birinchi marta bir necha soniya oladi..." : "Python muhitini yuklab bo'lmadi. Internetni tekshirib, sahifani yangilang."}
        </p>
      )}
      <div className="flex-1 min-h-0">
        {current && (
          <CodeEditor
            key={`${current.given ? "ro" : "rw"}-${language}`}
            file={current.name}
            lang={current.lang}
            value={current.value}
            readOnly={!draft.editable || !!current.given}
            onChange={onEdit}
          />
        )}
      </div>
    </div>
  );

  const logs = output?.logs || [];
  const preview = output?.preview;
  const resultPane = (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center gap-1 px-2 h-11 border-b border-line shrink-0">
        {(
          [
            { key: "tests", label: `Testlar${results ? ` ${passed}/${tests.length}` : ""}`, icon: HiOutlineBeaker },
            ...(kind === "sql" ? [{ key: "table", label: "Jadval", icon: HiOutlineTableCells }] : []),
            { key: "console", label: `Konsol${logs.length ? ` (${logs.length})` : ""}`, icon: HiOutlineCommandLine },
          ] as { key: OutTab; label: string; icon: typeof HiOutlineBeaker }[]
        ).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setOutTab(t.key)}
            className={cx(
              "h-8 px-3 rounded-lg text-[13px] font-medium cursor-pointer inline-flex items-center gap-1.5",
              outTab === t.key ? "bg-mist text-ink" : "text-muted hover:text-ink",
            )}
          >
            <t.icon size={15} /> {t.label}
          </button>
        ))}
        {running && kind === "code" && (
          <span className="ml-auto text-[12px] text-muted">
            {progress}/{tests.length}
          </span>
        )}
      </div>
      <div className="flex-1 overflow-y-auto">
        {outTab === "tests" ? (
          <div className="p-4 flex flex-col gap-3">
            {output?.fatal && <p className="text-[13px] text-rose-700 bg-rose-50 rounded-lg px-3 py-2">{output.fatal}</p>}
            {stale && <p className="text-[12px] text-amber-800 bg-amber-50 rounded-lg px-3 py-2">Kod o'zgardi — natijani yangilash uchun qayta tekshiring.</p>}
            <TestList tests={tests} results={results} running={running} />
          </div>
        ) : outTab === "table" ? (
          <SqlTable preview={preview ?? null} ran={!!output} />
        ) : (
          <ConsoleView logs={logs} />
        )}
      </div>
    </div>
  );

  return (
    <div className="h-dvh flex flex-col bg-paper text-ink">
      <WorkspaceHeader guest={guest} task={task} offset={offset} draft={draft} running={running} onRun={run} onSubmit={openSubmit} onExpired={onExpired} />
      <PaneSwitch
        panes={[
          { key: "brief", label: "Shartlar" },
          { key: "code", label: "Kod" },
          { key: "result", label: "Natija" },
        ]}
        value={mobilePane}
        onChange={setMobilePane}
      />

      <div className="flex-1 min-h-0 lg:grid lg:grid-cols-[minmax(260px,0.8fr)_minmax(0,1.4fr)_minmax(0,1.1fr)]">
        <section className={cx("h-full min-h-0 bg-surface lg:border-r border-line", mobilePane === "brief" ? "block" : "hidden lg:block")}>{brief}</section>
        <section className={cx("h-full min-h-0 bg-surface lg:border-r border-line", mobilePane === "code" ? "block" : "hidden lg:block")}>{editor}</section>
        <section className={cx("h-full min-h-0 bg-surface", mobilePane === "result" ? "block" : "hidden lg:block")}>{resultPane}</section>
      </div>

      <div className="sm:hidden p-2 border-t border-line bg-surface">
        <Button
          className="w-full"
          variant="secondary"
          loading={running}
          onClick={() => {
            setMobilePane("result");
            run();
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
          setCode(starterCode(sb, kind === "code" ? language : undefined));
          setOutput(null);
          setConfirmReset(false);
        }}
      />
      <ConfirmModal
        open={!!pendingLang}
        title="Tilni almashtirish"
        text={`${pendingLang ? LANG_LABEL[pendingLang] : ""} tanlansa, shu tilning shabloni ochiladi. Hozirgi ${LANG_LABEL[language]} kodingiz shu sahifa ochiq turguncha eslab qolinadi, lekin faqat tanlangan tildagi yechim saqlanadi va yuboriladi.`}
        confirmLabel="Almashtirish"
        onClose={() => setPendingLang(null)}
        onConfirm={() => pendingLang && switchLang(pendingLang)}
      />
    </div>
  );
}

/** Task turiga qarab qisqa yo'riqnoma */
function KindHint({ task }: { task: UserTask }) {
  const sb = task.sandbox!;
  const kind = kindOf(sb);
  const box = "rounded-xl bg-mist p-3.5 text-[13px] text-ink-2 leading-relaxed";
  if (kind === "code") {
    const fn = sb.entry || "";
    const py = fn.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
    return (
      <div className={box}>
        Tilni muharrir tepasidan tanlang. Testlar <code className="font-mono text-ink">{fn}</code>
        {py !== fn && (
          <>
            {" "}
            (Python'da <code className="font-mono text-ink">{py}</code>)
          </>
        )}{" "}
        funksiyangizni chaqiradi. <code className="font-mono">console.log</code> / <code className="font-mono">print</code> natijasi "Konsol"da chiqadi.
      </div>
    );
  }
  if (kind === "sql") {
    const tables = [...(sb.setup || "").matchAll(/CREATE TABLE\s+(\w+)\s*\(([\s\S]*?)\);/gi)].map((m) => ({
      name: m[1],
      cols: m[2]
        .split(/,(?![^(]*\))/)
        .map((c) => c.trim().split(/\s+/)[0])
        .filter((c) => c && !/^(PRIMARY|FOREIGN|UNIQUE|CHECK|CONSTRAINT)$/i.test(c)),
    }));
    return (
      <div className={box}>
        {tables.length ? (
          <>
            <p className="font-semibold text-ink mb-1.5">Bazadagi jadvallar</p>
            <ul className="flex flex-col gap-1 font-mono text-[12px]">
              {tables.map((t) => (
                <li key={t.name}>
                  <span className="text-ink font-semibold">{t.name}</span> ({t.cols.join(", ")})
                </li>
              ))}
            </ul>
            <p className="mt-2">To'liq tuzilma va ma'lumotlar — "baza.sql" tabida.</p>
          </>
        ) : (
          <p>Baza bo'sh — jadvallarni o'zingiz yaratasiz. Har tekshirishda baza noldan quriladi.</p>
        )}
      </div>
    );
  }
  if (kind === "qa")
    return (
      <div className={box}>
        Tekshiriladigan kod — "kod.js" tabida (faqat o'qish). Testlarni "tests.js" ga yozing: <code className="font-mono">test("...", () =&gt; expect(...).toBe(...))</code>. Platforma kodga ataylab xato
        kiritadi — testlaringiz uni ushlashi kerak.
      </div>
    );
  if (kind === "config") return <div className={box}>Fayllarni tablar orqali tahrirlang. Tekshiruv fayllarni o'qib, best practice'lar bo'yicha baholaydi.</div>;
  return null;
}
