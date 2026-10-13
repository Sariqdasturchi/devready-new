import { useMemo, useState } from "react";
import { HiOutlinePlay, HiOutlinePlus, HiOutlineTrash } from "react-icons/hi2";
import { Button, Input, Textarea, Toggle, cx } from "../ui";
import CodeEditor from "./CodeEditor";
import { PreviewFrame, TestList } from "./SandboxPanels";
import { SANDBOX_FILES, type SandboxFiles } from "./runtime";
import { useSandboxRunner } from "./useSandboxRunner";
import type { SandboxForm } from "./sandboxForm";

const HELP = "Yordamchilar: $(sel), $$(sel), await click(sel), await wait(ms), assert(shart, xabar), text(sel), style(sel, prop). Har bir test 2 soniyada tugashi kerak.";

/** Superadmin: task uchun kod muhiti — boshlang'ich fayllar va avtomatik testlar */
export default function SandboxSettings({ value, onChange }: { value: SandboxForm; onChange: (v: SandboxForm) => void }) {
  const [active, setActive] = useState<keyof SandboxFiles>("html");
  const [checked, setChecked] = useState(false);
  const tests = useMemo(() => value.tests.filter((t) => t.title.trim() && t.code.trim()), [value.tests]);
  const runner = useSandboxRunner(value.starter, tests, { live: false });
  const lang = SANDBOX_FILES.find((f) => f.key === active)!;

  const setTest = (i: number, patch: Partial<{ title: string; code: string }>) =>
    onChange({ ...value, tests: value.tests.map((t, j) => (j === i ? { ...t, ...patch } : t)) });

  return (
    <div className="sm:col-span-2 flex flex-col gap-3 rounded-xl border border-line p-4">
      <Toggle
        checked={value.enabled}
        onChange={(v) => onChange({ ...value, enabled: v, tests: v && !value.tests.length ? [{ title: "", code: "" }] : value.tests })}
        label={value.enabled ? "Kod muhiti yoqilgan — talaba brauzerda HTML/CSS/JS yozadi" : "Kod muhiti (HTML/CSS/JS tasklar uchun)"}
      />
      {value.enabled && (
        <>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-ink-2">Boshlang'ich kod</span>
            <div className="rounded-xl border border-line overflow-hidden">
              <div className="flex gap-0.5 px-1.5 h-10 items-center border-b border-line bg-surface" role="tablist">
                {SANDBOX_FILES.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    role="tab"
                    aria-selected={active === f.key}
                    onClick={() => setActive(f.key)}
                    className={cx("h-7 px-2.5 rounded-md text-[12px] font-mono cursor-pointer", active === f.key ? "bg-mist text-ink font-medium" : "text-muted hover:text-ink")}
                  >
                    {f.name}
                  </button>
                ))}
              </div>
              <div className="h-56">
                <CodeEditor
                  file={active}
                  lang={lang.lang}
                  value={value.starter[active]}
                  onChange={(v) => onChange({ ...value, starter: { ...value.starter, [active]: v } })}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-ink-2">Avtomatik testlar</span>
            <p className="text-[11px] text-muted">{HELP}</p>
            {value.tests.map((t, i) => (
              <div key={i} className="flex flex-col gap-1.5 rounded-xl bg-mist/60 p-2.5">
                <div className="flex gap-2">
                  <Input value={t.title} onChange={(e) => setTest(i, { title: e.target.value })} placeholder={`${i + 1}-test: talaba ko'radigan nom`} />
                  <Button variant="ghost" onClick={() => onChange({ ...value, tests: value.tests.filter((_, j) => j !== i) })} aria-label="Testni o'chirish">
                    <HiOutlineTrash />
                  </Button>
                </div>
                <Textarea
                  rows={3}
                  value={t.code}
                  onChange={(e) => setTest(i, { code: e.target.value })}
                  placeholder={"assert($('.card'), '.card topilmadi');"}
                  className="font-mono text-[12.5px] min-h-[76px]"
                  spellCheck={false}
                />
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => onChange({ ...value, tests: [...value.tests, { title: "", code: "" }] })}>
                <HiOutlinePlus /> Test qo'shish
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={!tests.length}
                loading={runner.running}
                onClick={() => {
                  setChecked(true);
                  runner.runTests();
                }}
              >
                <HiOutlinePlay /> Boshlang'ich kodda sinash
              </Button>
            </div>
          </div>

          {checked && (
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="rounded-xl border border-line p-3">
                <TestList tests={tests} results={runner.results} running={runner.running} compact />
                {runner.results && (
                  <p className="text-[11px] text-muted mt-2">
                    Boshlang'ich kodda odatda bir nechta test o'tmasligi kerak — talaba aynan shularni bajaradi. Xato matni tushunarli ekanini tekshiring.
                  </p>
                )}
              </div>
              <div className="h-48 rounded-xl border border-line overflow-hidden flex">
                <PreviewFrame frame={runner.frame} doc={runner.doc} frameKey={runner.frameKey} device="desktop" />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
