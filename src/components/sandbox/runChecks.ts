import type { CodeLanguage, SandboxCode, TaskSandbox } from "../../types/type";
import { defaultLanguage, kindOf } from "./kinds";
import { runCode, runConfig, runQa, runSql, type RunOutput } from "./runners/host";

/** Web'dan tashqari turlar uchun testlarni ishga tushirish (talaba muhiti va mentor oynasi uchun umumiy) */
export function runChecks(sb: TaskSandbox, code: SandboxCode, onProgress?: (done: number) => void): Promise<RunOutput> {
  const kind = kindOf(sb);
  if (kind === "code") {
    const lang = (code.language || defaultLanguage(sb)) as CodeLanguage;
    return runCode(lang, code.main || "", sb.cases || [], sb.entry || "", onProgress);
  }
  if (kind === "sql") return runSql(sb.setup || "", code.main || "", sb.checks || []);
  if (kind === "config") return runConfig(Object.fromEntries((code.files || []).map((f) => [f.name, f.content])), sb.tests || []);
  return runQa(sb.target || "", sb.names || [], sb.mutants || [], code.main || "", sb.minTests || 3);
}
