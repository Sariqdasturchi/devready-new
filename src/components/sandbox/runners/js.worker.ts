/// <reference lib="webworker" />
/**
 * JavaScript/TypeScript ishga tushiruvchi (Web Worker — sahifa, cookie va DOM'ga kira olmaydi).
 *  - case:   talaba funksiyasini test qadamlari bilan chaqirish (Backend/algoritm tasklari)
 *  - config: DevOps fayllarini (Dockerfile, YAML...) task testlari bilan tekshirish
 *  - qa:     talaba yozgan testlarni to'g'ri va "buzilgan" (mutant) kodga qarshi ishga tushirish
 * Cheksiz siklni host to'xtatadi (worker'ni terminate qiladi).
 */
import { transform } from "sucrase";
import YAML from "yaml";
import { matches, show } from "./compare";
import type { CodeCase, LogLine, RunResult } from "./types";

type Lang = "javascript" | "typescript";
type Msg =
  | { id: number; op: "case"; lang: Lang; code: string; case: CodeCase; entry: string }
  | { id: number; op: "config"; files: Record<string, string>; tests: { title: string; code: string }[] }
  | { id: number; op: "qa"; target: string; names: string[]; mutants: { title: string; code: string }[]; code: string; minTests: number };

let logs: LogLine[] = [];
const fmt = (v: unknown) => {
  if (typeof v === "string") return v;
  if (v instanceof Error) return `${v.name}: ${v.message}`;
  try {
    return JSON.stringify(v, null, 1);
  } catch {
    return String(v);
  }
};
const push = (level: LogLine["level"], args: unknown[]) => {
  if (logs.length < 300) logs.push({ level, text: args.map(fmt).join(" ").slice(0, 2000) });
};
const sandboxConsole = {
  log: (...a: unknown[]) => push("log", a),
  info: (...a: unknown[]) => push("info", a),
  warn: (...a: unknown[]) => push("warn", a),
  error: (...a: unknown[]) => push("error", a),
  debug: (...a: unknown[]) => push("log", a),
  table: (...a: unknown[]) => push("log", a),
};

const IDENT = /^[A-Za-z_$][\w$]*$/;

function compile(code: string, lang: Lang) {
  try {
    return transform(code, {
      transforms: lang === "typescript" ? ["typescript", "imports"] : ["imports"],
      disableESTransforms: true,
      production: true,
    }).code;
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    throw new Error(`Sintaksis xatosi: ${m}`, { cause: e });
  }
}

const noRequire = (name: string) => {
  throw new Error(`require("${name}") — bu muhitda tashqi modullar yo'q. Faqat standart JavaScript ishlating`);
};

/** Kodni alohida "modul" sifatida yuklaydi va kerakli nomlarni qaytaradi (har test uchun toza holat) */
function loadModule(compiled: string, names: string[], extra: Record<string, unknown> = {}, req: (name: string) => unknown = noRequire) {
  const safe = [...new Set(names)].filter((n) => IDENT.test(n));
  const grab = safe.map((n) => `${JSON.stringify(n)}: typeof ${n} !== "undefined" ? ${n} : undefined`).join(", ");
  const params = ["exports", "module", "require", "console", ...Object.keys(extra)];
  const mod = { exports: {} as Record<string, unknown> };
  const fn = new Function(...params, `${compiled}\n;return { ${grab} };`);
  const scope = fn(mod.exports, mod, req, sandboxConsole, ...Object.values(extra)) as Record<string, unknown>;
  const exp = mod.exports as Record<string, unknown>;
  const def = exp.default && typeof exp.default === "object" ? (exp.default as Record<string, unknown>) : {};
  return (name: string) => exp[name] ?? def[name] ?? scope[name];
}

const errMsg = (e: unknown) => (e instanceof Error ? `${e.name === "Error" ? "" : `${e.name}: `}${e.message}` : String(e));

async function runCase(m: Extract<Msg, { op: "case" }>): Promise<RunResult> {
  const t0 = performance.now();
  const title = m.case.title;
  try {
    const compiled = compile(m.code, m.lang);
    const names = [m.entry, ...m.case.steps.map((s) => s.call || m.entry)];
    const get = loadModule(compiled, names);
    for (const step of m.case.steps) {
      const name = step.call || m.entry;
      const fn = get(name);
      if (typeof fn !== "function") throw new Error(`"${name}" funksiyasi topilmadi. Uni e'lon qiling (function ${name}(...) {...})`);
      const args = structuredClone(step.args || []);
      const call = `${name}(${args.map((a) => show(a, 60)).join(", ")})`;
      let actual: unknown;
      try {
        actual = await (fn as (...a: unknown[]) => unknown)(...args);
      } catch (e) {
        if (step.match === "throws") continue;
        throw new Error(`${call} — xatolik: ${errMsg(e)}`, { cause: e });
      }
      if (step.match === "throws") throw new Error(`${call} xatolik tashlashi kerak edi, lekin ${show(actual)} qaytardi`);
      if (!matches(step.match, step.expect, actual)) {
        throw new Error(`${call} → kutilgan ${show(step.expect)}, olindi ${show(actual)}`);
      }
    }
    return { title, ok: true, ms: Math.round(performance.now() - t0) };
  } catch (e) {
    return { title, ok: false, error: errMsg(e), ms: Math.round(performance.now() - t0) };
  }
}

/* ───────────── DevOps: fayllarni tahlil qilish yordamchilari ───────────── */

type DockerInstr = { cmd: string; args: string; line: number };
function parseDocker(src: string): DockerInstr[] {
  const out: DockerInstr[] = [];
  const lines = src.split(/\r?\n/);
  let buf = "";
  let start = 0;
  lines.forEach((raw, i) => {
    const line = raw.replace(/\s+$/, "");
    if (!buf && (/^\s*#/.test(line) || !line.trim())) return;
    if (!buf) start = i + 1;
    if (line.endsWith("\\")) {
      buf += `${line.slice(0, -1)} `;
      return;
    }
    buf += line;
    const mm = buf.trim().match(/^(\S+)\s*([\s\S]*)$/);
    if (mm) out.push({ cmd: mm[1].toUpperCase(), args: mm[2].trim(), line: start });
    buf = "";
  });
  if (buf.trim()) {
    const mm = buf.trim().match(/^(\S+)\s*([\s\S]*)$/);
    if (mm) out.push({ cmd: mm[1].toUpperCase(), args: mm[2].trim(), line: start });
  }
  return out;
}

const AsyncFn = Object.getPrototypeOf(async function () {}).constructor as new (...a: string[]) => (...x: unknown[]) => Promise<unknown>;
const assert = (cond: unknown, msg?: string) => {
  if (!cond) throw new Error(msg || "Shart bajarilmadi");
};

async function runConfig(m: Extract<Msg, { op: "config" }>) {
  const file = (name: string) => {
    const v = m.files[name];
    if (v === undefined || !v.trim()) throw new Error(`${name} fayli bo'sh`);
    return v;
  };
  const yamlCache = new Map<string, unknown>();
  const yaml = (name: string) => {
    if (!yamlCache.has(name)) {
      try {
        yamlCache.set(name, YAML.parse(file(name)));
      } catch (e) {
        throw new Error(`${name}: YAML xatosi — ${errMsg(e).split("\n")[0]}`, { cause: e });
      }
    }
    return yamlCache.get(name) as Record<string, unknown>;
  };
  const docker = (name = "Dockerfile") => parseDocker(file(name));
  const lines = (name: string) => file(name).split(/\r?\n/);
  const has = (name: string, re: RegExp | string) => (typeof re === "string" ? file(name).includes(re) : re.test(file(name)));
  const results: RunResult[] = [];
  for (const t of m.tests) {
    const t0 = performance.now();
    try {
      const fn = new AsyncFn("file", "yaml", "docker", "lines", "has", "assert", t.code);
      await fn(file, yaml, docker, lines, has, assert);
      results.push({ title: t.title, ok: true, ms: Math.round(performance.now() - t0) });
    } catch (e) {
      results.push({ title: t.title, ok: false, error: errMsg(e), ms: Math.round(performance.now() - t0) });
    }
  }
  return results;
}

/* ───────────── QA: mini test freymvorki va mutatsion tekshiruv ───────────── */

type StudentTest = { name: string; fn: () => unknown };

function makeExpect() {
  const fail = (msg: string) => {
    throw new Error(msg);
  };
  const build = (actual: unknown, negate: boolean) => {
    const check = (pass: boolean, msg: string) => {
      if (pass === negate) fail(negate ? `Kutilmagan: ${msg}` : msg);
    };
    const api = {
      toBe: (exp: unknown) => check(Object.is(actual, exp), `${show(actual)} === ${show(exp)} bo'lishi kerak edi`),
      toEqual: (exp: unknown) => check(matches("equal", exp, actual), `${show(actual)} ${show(exp)} ga teng bo'lishi kerak edi`),
      toStrictEqual: (exp: unknown) => check(matches("equal", exp, actual), `${show(actual)} ${show(exp)} ga teng bo'lishi kerak edi`),
      toBeTruthy: () => check(!!actual, `${show(actual)} truthy bo'lishi kerak edi`),
      toBeFalsy: () => check(!actual, `${show(actual)} falsy bo'lishi kerak edi`),
      toBeNull: () => check(actual === null, `${show(actual)} null bo'lishi kerak edi`),
      toBeUndefined: () => check(actual === undefined, `${show(actual)} undefined bo'lishi kerak edi`),
      toBeDefined: () => check(actual !== undefined, "qiymat aniqlangan bo'lishi kerak edi"),
      toBeGreaterThan: (n: number) => check((actual as number) > n, `${show(actual)} > ${n} bo'lishi kerak edi`),
      toBeGreaterThanOrEqual: (n: number) => check((actual as number) >= n, `${show(actual)} >= ${n} bo'lishi kerak edi`),
      toBeLessThan: (n: number) => check((actual as number) < n, `${show(actual)} < ${n} bo'lishi kerak edi`),
      toBeLessThanOrEqual: (n: number) => check((actual as number) <= n, `${show(actual)} <= ${n} bo'lishi kerak edi`),
      toBeCloseTo: (n: number, digits = 2) => check(Math.abs((actual as number) - n) < 10 ** -digits / 2, `${show(actual)} ≈ ${n} bo'lishi kerak edi`),
      toContain: (x: unknown) =>
        check(
          typeof actual === "string" ? actual.includes(String(x)) : Array.isArray(actual) && actual.some((a) => matches("equal", x, a)),
          `${show(actual)} ichida ${show(x)} bo'lishi kerak edi`,
        ),
      toHaveLength: (n: number) => check((actual as { length?: number })?.length === n, `uzunlik ${n} bo'lishi kerak edi, ${show((actual as { length?: number })?.length)} chiqdi`),
      toHaveProperty: (k: string) => check(!!actual && typeof actual === "object" && k in (actual as object), `${k} xossasi bo'lishi kerak edi`),
      toMatch: (re: RegExp | string) => check(typeof actual === "string" && (typeof re === "string" ? actual.includes(re) : re.test(actual)), `${show(actual)} ${String(re)} ga mos bo'lishi kerak edi`),
      toThrow: (msg?: string | RegExp) => {
        let threw = false;
        let text = "";
        try {
          (actual as () => unknown)();
        } catch (e) {
          threw = true;
          text = errMsg(e);
        }
        const msgOk = !msg || (typeof msg === "string" ? text.includes(msg) : msg.test(text));
        check(threw && msgOk, threw ? `xato matni ${String(msg)} ga mos emas: "${text}"` : "funksiya xatolik tashlashi kerak edi");
      },
    };
    return api;
  };
  return (actual: unknown) => {
    const api = build(actual, false) as ReturnType<typeof build> & { not: ReturnType<typeof build>; resolves: unknown; rejects: unknown };
    api.not = build(actual, true);
    return api;
  };
}

async function runSuite(targetCompiled: string, names: string[], studentCompiled: string, selfImports: boolean) {
  const getTarget = loadModule(targetCompiled, names);
  const exportsObj: Record<string, unknown> = {};
  for (const n of names) exportsObj[n] = getTarget(n);
  const tests: StudentTest[] = [];
  const test = (name: string, fn: () => unknown) => {
    tests.push({ name: String(name), fn });
  };
  const describe = (_name: string, fn: () => void) => fn();
  const expect = makeExpect();
  // Talaba o'zi import/require qilsa — nomlar ikki marta e'lon qilinmasin
  const injected: Record<string, unknown> = { test, it: test, describe, expect, ...(selfImports ? {} : exportsObj) };
  // import { fn } from "./target" ham ishlaydi — har qanday nisbiy yo'l sinovdagi kodni qaytaradi
  loadModule(studentCompiled, [], injected, (name) => (/^\.{1,2}\//.test(name) ? exportsObj : noRequire(name)));
  const out: { name: string; ok: boolean; error?: string }[] = [];
  for (const t of tests) {
    try {
      await Promise.race([
        Promise.resolve().then(() => t.fn()),
        new Promise((_, rej) => setTimeout(() => rej(new Error("Test 2 soniyada tugamadi")), 2000)),
      ]);
      out.push({ name: t.name, ok: true });
    } catch (e) {
      out.push({ name: t.name, ok: false, error: errMsg(e) });
    }
  }
  return out;
}

async function runQa(m: Extract<Msg, { op: "qa" }>) {
  const results: RunResult[] = [];
  let student: string;
  let target: string;
  try {
    student = compile(m.code, "javascript");
    target = compile(m.target, "javascript");
  } catch (e) {
    return [{ title: "Test fayli ishga tushdi", ok: false, error: errMsg(e) }];
  }
  const selfImports = /\brequire\s*\(|^\s*import\s/m.test(m.code);
  let base: Awaited<ReturnType<typeof runSuite>>;
  try {
    base = await runSuite(target, m.names, student, selfImports);
  } catch (e) {
    return [{ title: "Test fayli ishga tushdi", ok: false, error: errMsg(e) }];
  }
  base.forEach((t) => push(t.ok ? "info" : "error", [`${t.ok ? "✓" : "✗"} ${t.name}${t.error ? ` — ${t.error}` : ""}`]));
  results.push({
    title: `Kamida ${m.minTests} ta test yozilgan`,
    ok: base.length >= m.minTests,
    error: base.length >= m.minTests ? undefined : `${base.length} ta test topildi`,
  });
  const failing = base.filter((t) => !t.ok);
  const baseOk = base.length > 0 && failing.length === 0;
  results.push({
    title: "To'g'ri kodda barcha testlaringiz o'tadi",
    ok: baseOk,
    error: baseOk ? undefined : base.length ? `O'tmadi: ${failing.map((t) => `"${t.name}" (${t.error})`).join("; ").slice(0, 400)}` : "Birorta test yozilmagan",
  });
  for (const mutant of m.mutants) {
    if (!baseOk) {
      results.push({ title: mutant.title, ok: false, error: "Avval to'g'ri kodda barcha testlar o'tishi kerak" });
      continue;
    }
    try {
      const run = await runSuite(compile(mutant.code, "javascript"), m.names, student, selfImports);
      const caught = run.filter((t) => !t.ok);
      results.push({
        title: mutant.title,
        ok: caught.length > 0,
        error: caught.length ? undefined : "Bu xatoni hech bir testingiz ushlamadi",
      });
    } catch {
      // Mutant kodning o'zi yiqilsa — testlar xatoni ushlagan hisoblanadi
      results.push({ title: mutant.title, ok: true });
    }
  }
  return results;
}

self.onmessage = async (e: MessageEvent<Msg>) => {
  const m = e.data;
  logs = [];
  try {
    if (m.op === "case") {
      const result = await runCase(m);
      self.postMessage({ id: m.id, result, logs });
    } else if (m.op === "config") {
      const results = await runConfig(m);
      self.postMessage({ id: m.id, results, logs });
    } else if (m.op === "qa") {
      const results = await runQa(m);
      self.postMessage({ id: m.id, results, logs });
    }
  } catch (err) {
    self.postMessage({ id: (m as { id: number }).id, fatal: errMsg(err), logs });
  }
};
