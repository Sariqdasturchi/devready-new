/** Test natijalarini taqqoslash — JS, Python va SQL ishga tushiruvchilari uchun umumiy */

export type Match = "equal" | "subset" | "approx" | "throws" | "unordered";

const EPS = 1e-9;

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

/** Python/JS farqlarini tekislash: Map → obyekt, Set → saralangan massiv, -0 → 0, undefined → null */
export function normalize(v: unknown, seen = new WeakSet<object>()): unknown {
  if (v === undefined) return null;
  if (typeof v === "number") return Object.is(v, -0) ? 0 : v;
  if (typeof v === "bigint") return Number(v);
  if (v instanceof Date) return v.toISOString();
  if (!v || typeof v !== "object") return v;
  if (seen.has(v)) return "[aylanma havola]";
  seen.add(v);
  if (v instanceof Map) return Object.fromEntries([...v.entries()].map(([k, x]) => [String(k), normalize(x, seen)]));
  if (v instanceof Set) return [...v].map((x) => normalize(x, seen)).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  if (Array.isArray(v)) return v.map((x) => normalize(x, seen));
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(v)) out[k] = normalize((v as Record<string, unknown>)[k], seen);
  return out;
}

export function deepEqual(a: unknown, b: unknown, eps = EPS): boolean {
  if (typeof a === "number" && typeof b === "number") {
    if (Number.isNaN(a) && Number.isNaN(b)) return true;
    return Math.abs(a - b) <= eps * Math.max(1, Math.abs(a), Math.abs(b));
  }
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, i) => deepEqual(x, b[i], eps));
  if (isObj(a) && isObj(b)) {
    const ka = Object.keys(a), kb = Object.keys(b);
    return ka.length === kb.length && ka.every((k) => Object.prototype.hasOwnProperty.call(b, k) && deepEqual(a[k], b[k], eps));
  }
  return false;
}

/** expected — actual ichida bor-yo'qligi (obyektlarda faqat kutilgan kalitlar tekshiriladi) */
export function isSubset(expected: unknown, actual: unknown, eps = EPS): boolean {
  if (isObj(expected) && isObj(actual)) return Object.keys(expected).every((k) => k in actual && isSubset(expected[k], actual[k], eps));
  if (Array.isArray(expected) && Array.isArray(actual)) return expected.length === actual.length && expected.every((x, i) => isSubset(x, actual[i], eps));
  return deepEqual(expected, actual, eps);
}

const key = (v: unknown) => JSON.stringify(v);

export function matches(match: Match | undefined, expected: unknown, actual: unknown): boolean {
  const e = normalize(expected);
  const a = normalize(actual);
  switch (match) {
    case "subset":
      return isSubset(e, a);
    case "approx":
      return deepEqual(e, a, 1e-6);
    case "unordered":
      return Array.isArray(e) && Array.isArray(a) && deepEqual([...e].sort((x, y) => key(x).localeCompare(key(y))), [...a].sort((x, y) => key(x).localeCompare(key(y))));
    default:
      return deepEqual(e, a);
  }
}

/** Qisqa ko'rinish (xato xabari uchun) */
export function show(v: unknown, max = 160): string {
  let s: string;
  try {
    s = typeof v === "string" ? JSON.stringify(v) : JSON.stringify(normalize(v));
  } catch {
    s = String(v);
  }
  if (s === undefined) s = "undefined";
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

/** camelCase → snake_case (Python funksiya nomlari uchun) */
export const snake = (name: string) => name.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();

/** SQL qiymatlarini taqqoslash uchun: raqamli satrlar → raqam, sana → ISO satr */
export function sqlCell(v: unknown): unknown {
  if (v === null || v === undefined) return null;
  if (typeof v === "bigint") return Number(v);
  if (v instanceof Date) return v.toISOString().slice(0, v.getUTCHours() || v.getUTCMinutes() || v.getUTCSeconds() ? 19 : 10);
  if (typeof v === "string" && /^-?\d+(\.\d+)?$/.test(v.trim())) return Number(v);
  if (typeof v === "boolean") return v;
  return v;
}

export function sqlRowsEqual(expected: unknown[][], actual: unknown[][], ordered: boolean): boolean {
  const e = expected.map((r) => r.map(sqlCell));
  const a = actual.map((r) => r.map(sqlCell));
  if (e.length !== a.length) return false;
  if (ordered) return deepEqual(e, a, 1e-6);
  const sort = (rows: unknown[][]) => [...rows].sort((x, y) => key(x).localeCompare(key(y)));
  return deepEqual(sort(e), sort(a), 1e-6);
}
