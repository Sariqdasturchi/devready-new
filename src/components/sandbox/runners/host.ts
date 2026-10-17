/**
 * Ishga tushiruvchilar boshqaruvi: worker'larni yaratadi, har bir testga vaqt chegarasi qo'yadi,
 * cheksiz siklda worker'ni to'xtatib, yangisini ochadi.
 */
import type { CodeCase, CodeLang, LogLine, RunResult, SqlCheck, SqlPreview } from "./types";

type Kind = "js" | "py" | "sql";

const make: Record<Kind, () => Worker> = {
  js: () => new Worker(new URL("./js.worker.ts", import.meta.url), { type: "module" }),
  py: () => new Worker(new URL("./py.worker.ts", import.meta.url), { type: "module" }),
  sql: () => new Worker(new URL("./sql.worker.ts", import.meta.url), { type: "module" }),
};

const workers: Partial<Record<Kind, Worker>> = {};
let seq = 0;

class Timeout extends Error {}

function get(kind: Kind) {
  if (!workers[kind]) workers[kind] = make[kind]();
  return workers[kind]!;
}
function kill(kind: Kind) {
  workers[kind]?.terminate();
  delete workers[kind];
}

/** Bitta xabar yuborib, javobni kutadi; vaqt tugasa worker o'ldiriladi */
function call<T>(kind: Kind, payload: Record<string, unknown>, timeoutMs: number): Promise<T> {
  const w = get(kind);
  const id = ++seq;
  return new Promise<T>((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timer);
      w.removeEventListener("message", onMsg);
      w.removeEventListener("error", onErr);
    };
    const timer = setTimeout(() => {
      cleanup();
      kill(kind);
      reject(new Timeout());
    }, timeoutMs);
    const onMsg = (e: MessageEvent) => {
      if (e.data?.id !== id) return;
      cleanup();
      resolve(e.data as T);
    };
    const onErr = (e: ErrorEvent) => {
      cleanup();
      kill(kind);
      reject(new Error(e.message || "Ishga tushiruvchi xatosi"));
    };
    w.addEventListener("message", onMsg);
    w.addEventListener("error", onErr);
    w.postMessage({ id, ...payload });
  });
}

export type RunOutput = { results: RunResult[]; logs: LogLine[]; preview?: SqlPreview; fatal?: string };

const TIMEOUT_TEXT = "Vaqt tugadi — cheksiz sikl yoki juda sekin kod bo'lishi mumkin";

/** Python muhitini oldindan yuklab qo'yish (sahifa ochilganda) */
export async function warmPython() {
  try {
    await call("py", { op: "init" }, 120_000);
    return true;
  } catch {
    return false;
  }
}

/** Funksiya tasklari: har bir test alohida, alohida vaqt chegarasi bilan */
export async function runCode(
  lang: CodeLang,
  code: string,
  cases: CodeCase[],
  entry: string,
  onProgress?: (done: number) => void,
): Promise<RunOutput> {
  const kind: Kind = lang === "python" ? "py" : "js";
  const results: RunResult[] = [];
  const logs: LogLine[] = [];
  if (kind === "py") {
    try {
      await call("py", { op: "init" }, 120_000);
    } catch {
      return { results: cases.map((c) => ({ title: c.title, ok: false, error: "Python muhitini yuklab bo'lmadi. Internetni tekshirib, qayta urinib ko'ring" })), logs, fatal: "Python muhiti yuklanmadi" };
    }
  }
  for (let i = 0; i < cases.length; i++) {
    const c = cases[i];
    try {
      const r = await call<{ result?: RunResult; logs?: LogLine[]; fatal?: string }>(kind, { op: "case", lang, code, case: c, entry }, kind === "py" ? 8000 : 4000);
      if (r.logs?.length) logs.push(...r.logs);
      results.push(r.result || { title: c.title, ok: false, error: r.fatal || "Noma'lum xato" });
    } catch (e) {
      results.push({ title: c.title, ok: false, error: e instanceof Timeout ? TIMEOUT_TEXT : e instanceof Error ? e.message : String(e) });
    }
    onProgress?.(i + 1);
  }
  return { results, logs: logs.slice(-300) };
}

export async function runSql(setup: string, script: string, checks: SqlCheck[]): Promise<RunOutput> {
  try {
    const r = await call<{ results?: RunResult[]; preview?: SqlPreview; logs?: LogLine[]; fatal?: string }>("sql", { op: "run", setup, script, checks }, 60_000);
    if (r.fatal) return { results: checks.map((c) => ({ title: c.title, ok: false, error: r.fatal })), logs: r.logs || [], fatal: r.fatal };
    return { results: r.results || [], logs: r.logs || [], preview: r.preview ?? null };
  } catch (e) {
    const err = e instanceof Timeout ? "So'rov juda uzoq bajarildi (60 s)" : e instanceof Error ? e.message : String(e);
    return { results: checks.map((c) => ({ title: c.title, ok: false, error: err })), logs: [], fatal: err };
  }
}

export async function runConfig(files: Record<string, string>, tests: { title: string; code: string }[]): Promise<RunOutput> {
  try {
    const r = await call<{ results?: RunResult[]; logs?: LogLine[]; fatal?: string }>("js", { op: "config", files, tests }, 10_000);
    return { results: r.results || tests.map((t) => ({ title: t.title, ok: false, error: r.fatal })), logs: r.logs || [] };
  } catch (e) {
    const err = e instanceof Timeout ? TIMEOUT_TEXT : e instanceof Error ? e.message : String(e);
    return { results: tests.map((t) => ({ title: t.title, ok: false, error: err })), logs: [] };
  }
}

export async function runQa(target: string, names: string[], mutants: { title: string; code: string }[], code: string, minTests: number): Promise<RunOutput> {
  try {
    const r = await call<{ results?: RunResult[]; logs?: LogLine[]; fatal?: string }>("js", { op: "qa", target, names, mutants, code, minTests }, 30_000);
    return { results: r.results || [{ title: "Testlar", ok: false, error: r.fatal }], logs: r.logs || [] };
  } catch (e) {
    const err = e instanceof Timeout ? TIMEOUT_TEXT : e instanceof Error ? e.message : String(e);
    return { results: [{ title: "Testlar ishga tushdi", ok: false, error: err }], logs: [] };
  }
}
