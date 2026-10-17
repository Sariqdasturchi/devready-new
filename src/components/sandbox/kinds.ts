/**
 * Kod muhiti turlari bo'yicha umumiy yordamchilar: boshlang'ich kod, testlar ro'yxati,
 * fayllar ko'rinishi va testlarni ishga tushirish (web'dan tashqari turlar uchun).
 */
import type { CodeLanguage, SandboxCode, SandboxKind, TaskSandbox } from "../../types/type";
import { LANG_FILE, LANG_LABEL } from "./runners/types";
import type { Lang } from "./CodeEditor";

export const kindOf = (sb?: TaskSandbox | null): SandboxKind => sb?.kind || "web";

export const KIND_LABEL: Record<SandboxKind, string> = {
  web: "HTML · CSS · JS",
  code: "Dasturlash tili tanlanadi",
  sql: "PostgreSQL",
  config: "DevOps fayllari",
  qa: "Test yozish",
};

/** Task kartalarida qisqa belgi: qaysi tillar/texnologiyalar */
export function stackLabel(sb?: TaskSandbox | null): string {
  const kind = kindOf(sb);
  if (kind === "code") return (sb?.languages?.length ? sb.languages : (["javascript", "typescript", "python"] as CodeLanguage[])).map((l) => LANG_LABEL[l]).join(" / ");
  if (kind === "web" && sb?.starter?.server) return "HTML · CSS · JS + server.js";
  if (kind === "config") return (sb?.files || []).map((f) => f.name.split("/").pop()).join(" · ") || KIND_LABEL.config;
  if (kind === "qa") return "JavaScript testlar";
  return KIND_LABEL[kind];
}

/** Test ro'yxati (natijalar shu tartibda keladi) */
export function testTitles(sb?: TaskSandbox | null): { title: string }[] {
  if (!sb) return [];
  switch (kindOf(sb)) {
    case "code":
      return (sb.cases || []).map((c) => ({ title: c.title }));
    case "sql":
      return (sb.checks || []).map((c) => ({ title: c.title }));
    case "qa":
      return [
        { title: `Kamida ${sb.minTests || 3} ta test yozilgan` },
        { title: "To'g'ri kodda barcha testlaringiz o'tadi" },
        ...(sb.mutants || []).map((m) => ({ title: m.title })),
      ];
    default:
      return (sb.tests || []).map((t) => ({ title: t.title }));
  }
}
export const testCount = (sb?: TaskSandbox | null) => testTitles(sb).length;

export function defaultLanguage(sb?: TaskSandbox | null): CodeLanguage {
  const langs = sb?.languages?.length ? sb.languages : (["javascript", "typescript", "python"] as CodeLanguage[]);
  return langs[0];
}

/** Task shablonidan boshlang'ich yechim */
export function starterCode(sb: TaskSandbox | null | undefined, language?: CodeLanguage): SandboxCode {
  const kind = kindOf(sb);
  if (kind === "web") {
    const s = sb?.starter || {};
    const out: SandboxCode = { html: s.html || "", css: s.css || "", js: s.js || "" };
    if (s.server) out.server = s.server;
    return out;
  }
  if (kind === "code") {
    const lang = language || defaultLanguage(sb);
    return { language: lang, main: sb?.starters?.[lang] || "" };
  }
  if (kind === "sql") return { language: "sql", main: sb?.starters?.sql || "" };
  if (kind === "qa") return { language: "javascript", main: sb?.starters?.javascript || "" };
  return { files: (sb?.files || []).map((f) => ({ name: f.name, content: f.starter || "" })) };
}

/** Saqlangan yechimni task turiga moslab to'ldiradi (yetishmagan fayllar shablondan) */
export function normalizeCode(sb: TaskSandbox | null | undefined, v?: SandboxCode | null): SandboxCode | null {
  if (!v) return null;
  const kind = kindOf(sb);
  if (kind === "web") {
    const out: SandboxCode = { html: v.html || "", css: v.css || "", js: v.js || "" };
    if (sb?.starter?.server || v.server) out.server = v.server || "";
    return out;
  }
  if (kind === "config") {
    const by = new Map((v.files || []).map((f) => [f.name, f.content]));
    return { files: (sb?.files || []).map((f) => ({ name: f.name, content: by.get(f.name) ?? f.starter ?? "" })) };
  }
  if (kind === "code") {
    const langs = sb?.languages?.length ? sb.languages : ["javascript", "typescript", "python"];
    const language = langs.includes(v.language || "") ? v.language : defaultLanguage(sb);
    return { language, main: v.main ?? "" };
  }
  return { language: kind === "sql" ? "sql" : "javascript", main: v.main ?? "" };
}

export const sameCode = (a: SandboxCode | null | undefined, b: SandboxCode | null | undefined) => JSON.stringify(a || null) === JSON.stringify(b || null);

/** Yechimda haqiqiy kod bormi */
export function hasCode(v?: SandboxCode | null) {
  if (!v) return false;
  if ([v.html, v.css, v.js, v.server, v.main].some((x) => String(x || "").trim())) return true;
  return !!v.files?.some((f) => f.content.trim());
}

const EXT_LANG: Record<string, Lang> = { yml: "yaml", yaml: "yaml", sql: "sql", py: "python", ts: "ts", js: "js", json: "js", html: "html", css: "css", sh: "shell", conf: "nginx" };

export function langFor(name: string, hint?: string): Lang {
  if (hint && ["dockerfile", "yaml", "nginx", "shell", "text"].includes(hint)) return hint as Lang;
  if (/(^|\/)Dockerfile/.test(name)) return "dockerfile";
  const ext = name.split(".").pop()?.toLowerCase() || "";
  return EXT_LANG[ext] || "text";
}

export const CODE_LANG: Record<CodeLanguage, Lang> = { javascript: "js", typescript: "ts", python: "python" };

/** Ko'rish uchun fayllar ro'yxati (mentor oynasi, AI matni bilan bir xil tartib) */
export function codeFiles(sb: TaskSandbox | null | undefined, v: SandboxCode): { name: string; lang: Lang; value: string; readOnly?: boolean; given?: boolean }[] {
  const kind = kindOf(sb);
  if (kind === "web") {
    const list: { name: string; lang: Lang; value: string }[] = [
      { name: "index.html", lang: "html", value: v.html || "" },
      { name: "style.css", lang: "css", value: v.css || "" },
      { name: "script.js", lang: "js", value: v.js || "" },
    ];
    if (v.server !== undefined || sb?.starter?.server) list.push({ name: "server.js", lang: "js", value: v.server || "" });
    return list;
  }
  if (kind === "code") {
    const l = (v.language || "javascript") as CodeLanguage;
    return [{ name: LANG_FILE[l] || "solution.txt", lang: CODE_LANG[l] || "text", value: v.main || "" }];
  }
  if (kind === "sql") {
    const list: { name: string; lang: Lang; value: string; given?: boolean }[] = [{ name: "solution.sql", lang: "sql", value: v.main || "" }];
    if (sb?.setup) list.push({ name: "baza.sql", lang: "sql", value: sb.setup, given: true });
    return list;
  }
  if (kind === "qa") {
    const list: { name: string; lang: Lang; value: string; given?: boolean }[] = [{ name: "tests.js", lang: "js", value: v.main || "" }];
    if (sb?.target) list.push({ name: "kod.js", lang: "js", value: sb.target, given: true });
    return list;
  }
  return (v.files || []).map((f) => ({ name: f.name, lang: langFor(f.name, sb?.files?.find((x) => x.name === f.name)?.lang), value: f.content }));
}

const lineCount = (v?: string) => (v ? v.split("\n").length : 0);

/** Qisqa tavsif: "HTML 20 · CSS 15 · JS 40 qator", "Python · 32 qator", "Dockerfile · .dockerignore" */
export function codeSummary(v: SandboxCode): string {
  if (v.files?.length) return v.files.map((f) => `${f.name.split("/").pop()} ${lineCount(f.content)}`).join(" · ") + " qator";
  if (v.language) {
    const label = v.language === "sql" ? "SQL" : LANG_LABEL[v.language as CodeLanguage] || v.language;
    return `${label} · ${lineCount(v.main)} qator`;
  }
  const parts = [`HTML ${lineCount(v.html)}`, `CSS ${lineCount(v.css)}`, `JS ${lineCount(v.js)}`];
  if (v.server !== undefined) parts.push(`server.js ${lineCount(v.server)}`);
  return parts.join(" · ") + " qator";
}
