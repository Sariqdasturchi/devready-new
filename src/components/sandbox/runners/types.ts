import type { Match } from "./compare";

export type CodeLang = "javascript" | "typescript" | "python";

/** Bitta chaqiruv: funksiya(args) → expect. call berilmasa — task.entry */
export type CodeStep = { call?: string; args?: unknown[]; expect?: unknown; match?: Match };
export type CodeCase = { title: string; steps: CodeStep[] };

export type SqlCheck = { title: string; sql: string; expected: unknown[][]; ordered?: boolean };

export type RunResult = { title: string; ok: boolean; error?: string; ms?: number };
export type LogLine = { level: "log" | "warn" | "error" | "info"; text: string };

export type SqlPreview = { columns: string[]; rows: unknown[][]; truncated?: boolean } | null;

export const LANG_LABEL: Record<CodeLang, string> = { javascript: "JavaScript", typescript: "TypeScript", python: "Python" };
export const LANG_FILE: Record<CodeLang, string> = { javascript: "solution.js", typescript: "solution.ts", python: "solution.py" };
