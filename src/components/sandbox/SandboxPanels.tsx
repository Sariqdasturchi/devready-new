import { useState, type RefObject } from "react";
import { HiOutlineCheckCircle, HiOutlineComputerDesktop, HiOutlineDevicePhoneMobile, HiOutlineXCircle } from "react-icons/hi2";
import { cx } from "../ui";
import type { ConsoleLine, SandboxTest, TestResult } from "./runtime";

/** Talaba kodi ishlaydigan oyna: sandbox="allow-scripts" — sayt cookie/token'lariga kira olmaydi */
export function PreviewFrame({
  frame,
  doc,
  frameKey,
  device,
}: {
  frame: RefObject<HTMLIFrameElement | null>;
  doc: string;
  frameKey: number;
  device: "desktop" | "mobile";
}) {
  return (
    <div className="flex-1 min-h-0 bg-mist flex justify-center overflow-auto">
      <iframe
        key={frameKey}
        ref={frame}
        title="Natija"
        sandbox="allow-scripts allow-modals allow-forms"
        srcDoc={doc}
        className={cx("bg-white h-full border-0 transition-[width] duration-300", device === "mobile" ? "w-[375px] shadow-[0_0_0_1px_var(--color-line)]" : "w-full")}
      />
    </div>
  );
}

export function DeviceSwitch({ device, onChange }: { device: "desktop" | "mobile"; onChange: (d: "desktop" | "mobile") => void }) {
  return (
    <div className="flex gap-0.5 rounded-lg bg-mist p-0.5">
      {(["desktop", "mobile"] as const).map((d) => (
        <button
          key={d}
          type="button"
          onClick={() => onChange(d)}
          aria-label={d === "desktop" ? "Kompyuter" : "Telefon (375px)"}
          aria-pressed={device === d}
          className={cx("h-7 w-8 inline-flex items-center justify-center rounded-md cursor-pointer", device === d ? "bg-surface text-ink shadow-sm" : "text-muted")}
        >
          {d === "desktop" ? <HiOutlineComputerDesktop size={16} /> : <HiOutlineDevicePhoneMobile size={16} />}
        </button>
      ))}
    </div>
  );
}

export function ConsoleView({ logs }: { logs: ConsoleLine[] }) {
  if (!logs.length) return <p className="px-3 py-3 text-muted text-[13px]">console.log() natijalari shu yerda chiqadi</p>;
  return (
    <div className="font-mono text-[12.5px]">
      {logs.map((l, i) => (
        <div
          key={i}
          className={cx(
            "px-3 py-1.5 border-b border-line/60 whitespace-pre-wrap break-words",
            l.level === "error" ? "text-rose-600 bg-rose-50" : l.level === "warn" ? "text-amber-800 bg-amber-50" : "text-ink-2",
          )}
        >
          {l.text}
        </div>
      ))}
    </div>
  );
}

export function TestList({ tests, results, running, compact }: { tests: SandboxTest[]; results: TestResult[] | null; running: boolean; compact?: boolean }) {
  const passed = results?.filter((r) => r.ok).length ?? 0;
  const all = !!results && passed === tests.length;
  return (
    <div className="flex flex-col gap-3">
      {results && !compact && (
        <div className={cx("rounded-xl p-3.5", all ? "bg-emerald-50" : "bg-mist")}>
          <p className={cx("text-sm font-bold", all ? "text-emerald-700" : "text-ink")}>{all ? "Barcha testlar o'tdi" : `${passed} / ${tests.length} test o'tdi`}</p>
          <div className="mt-2 h-1.5 rounded-full bg-line overflow-hidden">
            <div className={cx("h-full rounded-full transition-all", all ? "bg-emerald-600" : "bg-brand")} style={{ width: `${(passed / Math.max(1, tests.length)) * 100}%` }} />
          </div>
        </div>
      )}
      <ul className="flex flex-col gap-1.5">
        {tests.map((t, i) => {
          const r = results?.[i];
          return (
            <li key={`${i}-${t.title}`} className="flex gap-2.5 text-[13px]">
              {running ? (
                <span className="w-[17px] h-[17px] mt-px rounded-full border-2 border-brand/30 border-t-brand animate-spin shrink-0" />
              ) : r ? (
                r.ok ? (
                  <HiOutlineCheckCircle className="text-emerald-600 shrink-0" size={18} aria-label="O'tdi" />
                ) : (
                  <HiOutlineXCircle className="text-rose-600 shrink-0" size={18} aria-label="O'tmadi" />
                )
              ) : (
                <span className="w-[17px] h-[17px] mt-px rounded-full border border-line shrink-0" />
              )}
              <span className="min-w-0">
                <span className={cx(r && !r.ok ? "text-ink" : "text-ink-2")}>{t.title}</span>
                {r && !r.ok && r.error && <span className="block text-[12px] text-rose-600 mt-0.5 break-words">{r.error}</span>}
              </span>
            </li>
          );
        })}
      </ul>
      {!results && !running && <p className="text-[12px] text-muted">Testlar hali ishga tushirilmagan. "Tekshirish" tugmasini bosing.</p>}
    </div>
  );
}

/** Pastki panel: konsol yoki testlar */
export function BottomPanel({
  logs,
  tests,
  results,
  running,
  tab,
  onTab,
}: {
  logs: ConsoleLine[];
  tests: SandboxTest[];
  results: TestResult[] | null;
  running: boolean;
  tab?: "console" | "tests";
  onTab?: (t: "console" | "tests") => void;
}) {
  const [own, setOwn] = useState<"console" | "tests">("console");
  const current = tab ?? own;
  const set = onTab ?? setOwn;
  const passed = results?.filter((r) => r.ok).length ?? 0;
  return (
    <div className="h-[38%] min-h-32 border-t border-line flex flex-col shrink-0">
      <div className="flex gap-1 px-2 h-10 items-center border-b border-line shrink-0">
        {(["console", "tests"] as const).map((b) => (
          <button
            key={b}
            type="button"
            onClick={() => set(b)}
            className={cx("h-7 px-2.5 rounded-md text-[12px] font-medium cursor-pointer", current === b ? "bg-mist text-ink" : "text-muted hover:text-ink")}
          >
            {b === "console" ? `Konsol${logs.length ? ` (${logs.length})` : ""}` : `Testlar${results ? ` ${passed}/${tests.length}` : ""}`}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto">
        {current === "console" ? (
          <ConsoleView logs={logs} />
        ) : (
          <div className="p-3">
            <TestList tests={tests} results={results} running={running} compact />
          </div>
        )}
      </div>
    </div>
  );
}
