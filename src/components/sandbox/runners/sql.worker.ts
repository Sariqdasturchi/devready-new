/// <reference lib="webworker" />
/**
 * SQL ishga tushiruvchi — haqiqiy PostgreSQL (PGlite, WebAssembly) brauzerning o'zida.
 * Har ishga tushirishda baza tozalanadi: task sxemasi + ma'lumotlari → talaba skripti → tekshiruv so'rovlari.
 */
import { PGlite } from "@electric-sql/pglite";
import { sqlRowsEqual, show } from "./compare";
import type { LogLine, RunResult, SqlCheck, SqlPreview } from "./types";

type Msg = { id: number; op: "run"; setup: string; script: string; checks: SqlCheck[] };

let db: PGlite | null = null;

async function fresh() {
  if (!db) db = await PGlite.create();
  // Oldingi ishga tushirishdan qolgan hamma narsani tozalaymiz
  await db.exec(`
    DROP SCHEMA IF EXISTS public CASCADE;
    CREATE SCHEMA public;
    SET search_path TO public;
    SET statement_timeout = '5s';
  `);
  return db;
}

const msg = (e: unknown) => {
  const err = e as { message?: string; position?: string; detail?: string; hint?: string };
  return [err?.message || String(e), err?.detail, err?.hint ? `Maslahat: ${err.hint}` : ""].filter(Boolean).join(". ");
};

type ExecResult = { rows: Record<string, unknown>[]; fields: { name: string }[]; affectedRows?: number };

function toPreview(results: ExecResult[]): SqlPreview {
  const last = [...results].reverse().find((r) => r.fields?.length);
  if (!last) return null;
  const columns = last.fields.map((f) => f.name);
  const rows = last.rows.slice(0, 200).map((r) => columns.map((c) => r[c]));
  return { columns, rows, truncated: last.rows.length > 200 };
}

self.onmessage = async (e: MessageEvent<Msg>) => {
  const m = e.data;
  const logs: LogLine[] = [];
  const results: RunResult[] = [];
  let preview: SqlPreview = null;
  try {
    const d = await fresh();
    try {
      if (m.setup.trim()) await d.exec(m.setup);
    } catch (err) {
      self.postMessage({ id: m.id, fatal: `Task bazasini yaratib bo'lmadi: ${msg(err)}`, logs });
      return;
    }
    let scriptOk = true;
    if (m.script.trim()) {
      try {
        const res = (await d.exec(m.script)) as ExecResult[];
        preview = toPreview(res);
        const affected = res.reduce((n, r) => n + (r.affectedRows || 0), 0);
        logs.push({ level: "info", text: `Skript bajarildi: ${res.length} ta buyruq${affected ? `, ${affected} ta qator o'zgardi` : ""}` });
      } catch (err) {
        scriptOk = false;
        logs.push({ level: "error", text: `SQL xatosi: ${msg(err)}` });
      }
    }
    for (const c of m.checks) {
      const t0 = performance.now();
      try {
        const r = (await d.query(c.sql, [], { rowMode: "array" })) as { rows: unknown[][] };
        const ok = sqlRowsEqual(c.expected, r.rows, !!c.ordered);
        results.push({
          title: c.title,
          ok,
          error: ok ? undefined : `Kutilgan ${c.expected.length} qator: ${show(c.expected, 140)}; olindi ${r.rows.length} qator: ${show(r.rows, 140)}`,
          ms: Math.round(performance.now() - t0),
        });
      } catch (err) {
        results.push({
          title: c.title,
          ok: false,
          error: scriptOk ? msg(err) : `Skriptdagi xato tufayli tekshirib bo'lmadi: ${msg(err)}`,
          ms: Math.round(performance.now() - t0),
        });
      }
    }
    self.postMessage({ id: m.id, results, preview, logs });
  } catch (err) {
    db = null;
    self.postMessage({ id: m.id, fatal: `SQL muhitini ishga tushirib bo'lmadi: ${msg(err)}`, logs });
  }
};
