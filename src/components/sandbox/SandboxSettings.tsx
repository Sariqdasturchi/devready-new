import { useMemo, useState } from "react";
import { HiOutlinePlay, HiOutlinePlus, HiOutlineTrash } from "react-icons/hi2";
import type { SandboxKind } from "../../types/type";
import { Button, Input, Select, Textarea, Toggle, cx } from "../ui";
import CodeEditor from "./CodeEditor";
import { starterCode, testTitles } from "./kinds";
import { runChecks } from "./runChecks";
import type { RunOutput } from "./runners/host";
import { PreviewFrame, TestList } from "./SandboxPanels";
import { SANDBOX_FILES, SERVER_FILE, type SandboxFiles } from "./runtime";
import { useSandboxRunner } from "./useSandboxRunner";
import { JSON_TEMPLATES, KIND_OPTIONS, formToSandbox, type SandboxForm } from "./sandboxForm";

const HELP =
  "Yordamchilar: $(sel), $$(sel), await click(sel), await type(sel, qiymat), await submit(form), await until(() => shart), await wait(ms), assert(shart, xabar), text(sel), style(sel, prop). server.js bo'lsa fetch('/api/...') ham ishlaydi. Har bir test 2 soniyada tugashi kerak.";

const JSON_HELP: Record<Exclude<SandboxKind, "web">, string> = {
  code: "languages, entry (funksiya nomi; Python'da avtomatik snake_case), starters { javascript, typescript, python }, cases [{ title, steps: [{ call?, args, expect, match?: equal|subset|approx|throws|unordered }] }]. API tasklari: entry \"handle\", args: [{ method, path, query, headers, body }].",
  sql: "setup (jadval + ma'lumot), starters { sql }, checks [{ title, sql, expected: [[...qatorlar]], ordered? }]. Talaba VIEW yaratadi — tekshiruv undan SELECT qiladi.",
  config: "files [{ name, lang: dockerfile|yaml|nginx|shell|text, starter }], tests [{ title, code }]. Yordamchilar: file(nom), yaml(nom), docker(nom) → [{cmd, args, line}], lines(nom), has(nom, re), assert.",
  qa: "target (to'g'ri kod), names (talabaga beriladigan nomlar), minTests, starters { javascript }, mutants [{ title, code }] — har biri ataylab xatoli versiya.",
};

/** Superadmin: task uchun kod muhiti — boshlang'ich fayllar va avtomatik testlar */
export default function SandboxSettings({ value, onChange }: { value: SandboxForm; onChange: (v: SandboxForm) => void }) {
  const [active, setActive] = useState<keyof SandboxFiles>("html");
  const [checked, setChecked] = useState(false);
  const tests = useMemo(() => value.tests.filter((t) => t.title.trim() && t.code.trim()), [value.tests]);
  const webFiles = useMemo<SandboxFiles>(
    () => (value.withServer ? { ...value.starter, server: value.starter.server || "" } : { html: value.starter.html, css: value.starter.css, js: value.starter.js }),
    [value.starter, value.withServer],
  );
  const runner = useSandboxRunner(webFiles, tests, { live: false });
  const fileList = value.withServer ? [...SANDBOX_FILES, SERVER_FILE] : SANDBOX_FILES;
  const lang = fileList.find((f) => f.key === active) || fileList[0];
  const [jsonOut, setJsonOut] = useState<{ titles: { title: string }[]; out: RunOutput } | string | null>(null);
  const [jsonRunning, setJsonRunning] = useState(false);

  const setKind = (kind: SandboxKind) =>
    onChange({ ...value, kind, json: kind !== "web" && !value.json.trim() ? JSON.stringify(JSON_TEMPLATES[kind], null, 2) : value.json });

  /** JSON sozlamani boshlang'ich kodda sinab ko'rish */
  const tryJson = async () => {
    const sb = formToSandbox(value);
    if (typeof sb === "string" || !sb) return setJsonOut(sb || "Sozlama bo'sh");
    setJsonRunning(true);
    try {
      setJsonOut({ titles: testTitles(sb), out: await runChecks(sb, starterCode(sb)) });
    } finally {
      setJsonRunning(false);
    }
  };

  const setTest = (i: number, patch: Partial<{ title: string; code: string }>) =>
    onChange({ ...value, tests: value.tests.map((t, j) => (j === i ? { ...t, ...patch } : t)) });

  return (
    <div className="sm:col-span-2 flex flex-col gap-3 rounded-xl border border-line p-4">
      <Toggle
        checked={value.enabled}
        onChange={(v) => onChange({ ...value, enabled: v, tests: v && !value.tests.length ? [{ title: "", code: "" }] : value.tests })}
        label={value.enabled ? "Kod muhiti yoqilgan — talaba brauzerda kod yozadi va testlar avtomatik ishlaydi" : "Kod muhiti (brauzerda kod yozish va avtomatik testlar)"}
      />
      {value.enabled && (
        <Select value={value.kind} onChange={(e) => setKind(e.target.value as SandboxKind)} aria-label="Kod muhiti turi">
          {KIND_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      )}
      {value.enabled && value.kind !== "web" && (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold text-ink-2">Sozlama (JSON)</span>
          <p className="text-[11px] text-muted">{JSON_HELP[value.kind]}</p>
          <Textarea
            rows={16}
            value={value.json}
            onChange={(e) => onChange({ ...value, json: e.target.value })}
            className="font-mono text-[12px] min-h-[320px]"
            spellCheck={false}
          />
          <Button variant="secondary" size="sm" className="self-start" loading={jsonRunning} onClick={tryJson}>
            <HiOutlinePlay /> Boshlang'ich kodda sinash
          </Button>
          {typeof jsonOut === "string" ? (
            <p className="text-[12px] text-rose-600">{jsonOut}</p>
          ) : (
            jsonOut && (
              <div className="rounded-xl border border-line p-3">
                <TestList tests={jsonOut.titles} results={jsonOut.out.results} running={false} compact />
                <p className="text-[11px] text-muted mt-2">Boshlang'ich kodda testlar o'tmasligi kerak — talaba aynan shularni bajaradi.</p>
              </div>
            )
          )}
        </div>
      )}
      {value.enabled && value.kind === "web" && (
        <>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <Toggle
              checked={value.withServer}
              onChange={(v) => {
                onChange({ ...value, withServer: v, starter: v && !value.starter.server ? { ...value.starter, server: "function handle(request) {\n  return { status: 404, body: { error: \"not_found\" } };\n}\n" } : value.starter });
                if (!v && active === "server") setActive("html");
              }}
              label="server.js (fullstack: fetch('/api/...') shu faylga tushadi)"
            />
            <Toggle checked={value.viewport === "mobile"} onChange={(v) => onChange({ ...value, viewport: v ? "mobile" : "desktop" })} label="Telefon ekrani (Mobile tasklar)" />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-ink-2">Boshlang'ich kod</span>
            <div className="rounded-xl border border-line overflow-hidden">
              <div className="flex gap-0.5 px-1.5 h-10 items-center border-b border-line bg-surface" role="tablist">
                {fileList.map((f) => (
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
                  file={lang.key}
                  lang={lang.lang}
                  value={value.starter[lang.key] || ""}
                  onChange={(v) => onChange({ ...value, starter: { ...value.starter, [lang.key]: v } })}
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
