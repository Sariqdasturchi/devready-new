/// <reference lib="webworker" />
/**
 * Python ishga tushiruvchi — Pyodide (CPython WebAssembly'da), saytning o'zidan (/pyodide/) yuklanadi.
 * Birinchi yuklash bir necha soniya oladi, keyin worker qayta ishlatiladi.
 * Har test uchun toza nomlar fazosi (namespace) — testlar bir-biriga ta'sir qilmaydi.
 */
import { matches, show, snake } from "./compare";
import type { CodeCase, LogLine, RunResult } from "./types";

type Msg = { id: number; op: "init" } | { id: number; op: "case"; code: string; case: CodeCase; entry: string };

type PyProxy = { destroy?: () => void; get?: (k: string) => unknown };
type Pyodide = {
  runPython: (code: string, opts?: { globals?: PyProxy }) => unknown;
  globals: { get: (k: string) => (...a: unknown[]) => unknown };
  setStdout: (o: { batched: (s: string) => void }) => void;
  setStderr: (o: { batched: (s: string) => void }) => void;
};

let logs: LogLine[] = [];
const push = (level: LogLine["level"], text: string) => {
  if (logs.length < 300) logs.push({ level, text: text.slice(0, 2000) });
};

const HELPER = `
import json, math

def __dr_conv(v):
    if isinstance(v, (set, frozenset)):
        return sorted([__dr_conv(x) for x in v], key=lambda x: json.dumps(x, sort_keys=True, default=str))
    if isinstance(v, (list, tuple)):
        return [__dr_conv(x) for x in v]
    if isinstance(v, dict):
        return {str(k): __dr_conv(x) for k, x in v.items()}
    if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
        return None
    if isinstance(v, (str, int, float, bool)) or v is None:
        return v
    if hasattr(v, "__dict__"):
        return {k: __dr_conv(x) for k, x in vars(v).items() if not k.startswith("_")}
    return str(v)

def __dr_call(ns, name, args_json):
    fn = ns.get(name)
    if fn is None or not callable(fn):
        raise NameError(f'"{name}" funksiyasi topilmadi. Uni e\\'lon qiling: def {name}(...):')
    return json.dumps(__dr_conv(fn(*json.loads(args_json))), default=str)
`;

let py: Pyodide | null = null;
let loading: Promise<Pyodide> | null = null;

function load(): Promise<Pyodide> {
  if (py) return Promise.resolve(py);
  if (!loading) {
    loading = (async () => {
      const base = new URL("/pyodide/", self.location.origin).href;
      const mod = (await import(/* @vite-ignore */ `${base}pyodide.mjs`)) as { loadPyodide: (o: { indexURL: string }) => Promise<Pyodide> };
      const p = await mod.loadPyodide({ indexURL: base });
      p.setStdout({ batched: (s) => push("log", s) });
      p.setStderr({ batched: (s) => push("error", s) });
      p.runPython(HELPER);
      py = p;
      return p;
    })();
  }
  return loading;
}

/** Python traceback'idan foydali qism: oxirgi qator + talaba kodidagi qator raqami */
function pyError(e: unknown) {
  const text = e instanceof Error ? e.message : String(e);
  const lines = text.trim().split("\n").filter(Boolean);
  const last = lines[lines.length - 1] || text;
  const where = [...text.matchAll(/File "<exec>", line (\d+)/g)].pop();
  return where ? `${last} (${where[1]}-qator)` : last;
}

async function runCase(m: Extract<Msg, { op: "case" }>): Promise<RunResult> {
  const t0 = performance.now();
  const p = await load();
  const ns = p.globals.get("dict")() as PyProxy;
  const call = p.globals.get("__dr_call");
  try {
    try {
      p.runPython(m.code, { globals: ns });
    } catch (e) {
      throw new Error(`Kodni ishga tushirishda xato: ${pyError(e)}`, { cause: e });
    }
    for (const step of m.case.steps) {
      const name = snake(step.call || m.entry);
      const args = step.args || [];
      const shown = `${name}(${args.map((a) => show(a, 60)).join(", ")})`;
      let actual: unknown;
      try {
        actual = JSON.parse(call(ns, name, JSON.stringify(args)) as string);
      } catch (e) {
        if (step.match === "throws") continue;
        throw new Error(`${shown} — xatolik: ${pyError(e)}`, { cause: e });
      }
      if (step.match === "throws") throw new Error(`${shown} xatolik (raise) qilishi kerak edi, lekin ${show(actual)} qaytardi`);
      if (!matches(step.match, step.expect, actual)) throw new Error(`${shown} → kutilgan ${show(step.expect)}, olindi ${show(actual)}`);
    }
    return { title: m.case.title, ok: true, ms: Math.round(performance.now() - t0) };
  } catch (e) {
    return { title: m.case.title, ok: false, error: e instanceof Error ? e.message : String(e), ms: Math.round(performance.now() - t0) };
  } finally {
    ns.destroy?.();
  }
}

self.onmessage = async (e: MessageEvent<Msg>) => {
  const m = e.data;
  logs = [];
  try {
    if (m.op === "init") {
      await load();
      self.postMessage({ id: m.id, ready: true });
    } else {
      const result = await runCase(m);
      self.postMessage({ id: m.id, result, logs });
    }
  } catch (err) {
    self.postMessage({ id: m.id, fatal: `Python muhitini yuklab bo'lmadi: ${err instanceof Error ? err.message : String(err)}`, logs });
  }
};
