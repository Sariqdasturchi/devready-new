import type { SandboxKind, TaskSandbox } from "../../types/type";
import type { SandboxFiles } from "./runtime";

/**
 * Superadmin formasi: web tasklar — fayllar va DOM testlari vizual tahrirlanadi;
 * boshqa turlar (code / sql / config / qa) — sozlama JSON ko'rinishida (namuna shablon bilan).
 */
export type SandboxForm = {
  enabled: boolean;
  kind: SandboxKind;
  starter: SandboxFiles;
  withServer: boolean;
  viewport: "desktop" | "mobile";
  tests: { title: string; code: string }[];
  json: string;
};

export const EMPTY_SANDBOX: SandboxForm = {
  enabled: false,
  kind: "web",
  starter: { html: "", css: "", js: "" },
  withServer: false,
  viewport: "desktop",
  tests: [],
  json: "",
};

export const KIND_OPTIONS: { value: SandboxKind; label: string }[] = [
  { value: "web", label: "Web — HTML/CSS/JS (+ server.js)" },
  { value: "code", label: "Dasturlash tili — JS / TS / Python" },
  { value: "sql", label: "SQL — PostgreSQL" },
  { value: "config", label: "DevOps fayllari" },
  { value: "qa", label: "QA — talaba test yozadi" },
];

/** Har bir tur uchun namunaviy JSON (yangi task ochilganda) */
export const JSON_TEMPLATES: Record<Exclude<SandboxKind, "web">, object> = {
  code: {
    languages: ["javascript", "typescript", "python"],
    entry: "sum",
    starters: {
      javascript: "function sum(a, b) {\n  // ...\n}\n",
      typescript: "export function sum(a: number, b: number): number {\n  return 0;\n}\n",
      python: "def sum(a, b):\n    pass\n",
    },
    cases: [{ title: "Oddiy holat", steps: [{ args: [2, 3], expect: 5 }] }],
  },
  sql: {
    setup: "CREATE TABLE users (id int PRIMARY KEY, name text);\nINSERT INTO users VALUES (1, 'Ali');",
    starters: { sql: "CREATE VIEW result AS\nSELECT name FROM users;\n" },
    checks: [{ title: "result view", sql: "SELECT name FROM result", expected: [["Ali"]], ordered: true }],
  },
  config: {
    files: [{ name: "Dockerfile", lang: "dockerfile", starter: "FROM node\n" }],
    tests: [{ title: "Aniq versiya", code: "assert(/^node:\\d+/.test(docker('Dockerfile')[0].args), 'versiya yo\\'q');" }],
  },
  qa: {
    target: "function sum(a, b) {\n  return a + b;\n}\n",
    names: ["sum"],
    minTests: 3,
    starters: { javascript: "test(\"2 + 2\", () => {\n  expect(sum(2, 2)).toBe(4);\n});\n" },
    mutants: [{ title: "Mutant: ayirish", code: "function sum(a, b) {\n  return a - b;\n}\n" }],
  },
};

export function sandboxToForm(s?: TaskSandbox | null): SandboxForm {
  if (!s?.enabled) return EMPTY_SANDBOX;
  const kind = s.kind || "web";
  if (kind !== "web") {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { enabled, kind: _k, starter, viewport, ...rest } = s;
    return { ...EMPTY_SANDBOX, enabled: true, kind, json: JSON.stringify(rest, null, 2) };
  }
  return {
    ...EMPTY_SANDBOX,
    enabled: true,
    kind,
    starter: { html: s.starter?.html || "", css: s.starter?.css || "", js: s.starter?.js || "", ...(s.starter?.server ? { server: s.starter.server } : {}) },
    withServer: !!s.starter?.server,
    viewport: s.viewport === "mobile" ? "mobile" : "desktop",
    tests: (s.tests || []).map((t) => ({ title: t.title, code: t.code })),
  };
}

/** Formani API uchun obyektga aylantiradi; xato bo'lsa — matn qaytaradi */
export function formToSandbox(f: SandboxForm): TaskSandbox | null | string {
  if (!f.enabled) return null;
  if (f.kind === "web") {
    const tests = f.tests.filter((t) => t.title.trim() || t.code.trim());
    if (!tests.length) return "Kod muhiti uchun kamida bitta test yozing";
    if (tests.some((t) => !t.title.trim() || !t.code.trim())) return "Har bir testning nomi va kodi bo'lishi kerak";
    const starter = { html: f.starter.html, css: f.starter.css, js: f.starter.js, ...(f.withServer ? { server: f.starter.server || "" } : {}) };
    return { enabled: true, kind: "web", starter, viewport: f.viewport, tests: tests.map((t) => ({ title: t.title.trim(), code: t.code.trim() })) };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(f.json || "{}");
  } catch (e) {
    return `Sozlama JSON noto'g'ri: ${e instanceof Error ? e.message : String(e)}`;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return "Sozlama JSON obyekt bo'lishi kerak";
  const p = parsed as Record<string, unknown>;
  if (f.kind === "code" && !(Array.isArray(p.cases) && p.cases.length)) return "code: kamida bitta test (cases) kerak";
  if (f.kind === "sql" && !(Array.isArray(p.checks) && p.checks.length)) return "sql: kamida bitta tekshiruv (checks) kerak";
  if (f.kind === "config" && !(Array.isArray(p.files) && p.files.length)) return "config: kamida bitta fayl (files) kerak";
  if (f.kind === "qa" && !(typeof p.target === "string" && Array.isArray(p.mutants) && p.mutants.length)) return "qa: target va kamida bitta mutant kerak";
  return { ...(p as Partial<TaskSandbox>), enabled: true, kind: f.kind };
}
