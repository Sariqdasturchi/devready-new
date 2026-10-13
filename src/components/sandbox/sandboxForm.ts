import type { TaskSandbox } from "../../types/type";
import type { SandboxFiles } from "./runtime";

export type SandboxForm = { enabled: boolean; starter: SandboxFiles; tests: { title: string; code: string }[] };

export const EMPTY_SANDBOX: SandboxForm = { enabled: false, starter: { html: "", css: "", js: "" }, tests: [] };

export function sandboxToForm(s?: TaskSandbox | null): SandboxForm {
  if (!s?.enabled) return EMPTY_SANDBOX;
  return {
    enabled: true,
    starter: { html: s.starter?.html || "", css: s.starter?.css || "", js: s.starter?.js || "" },
    tests: (s.tests || []).map((t) => ({ title: t.title, code: t.code })),
  };
}

