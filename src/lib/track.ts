/**
 * Anonim statistika (voronka uchun). Shaxsiy ma'lumot yuborilmaydi — faqat brauzerdagi tasodifiy ID,
 * hodisa nomi va qayerdan kelgani (instagram, telegram...). Xatolar e'tiborsiz: statistika sayt ishiga xalaqit bermaydi.
 */
import { API_URL } from "../api/api";

export type TrackEvent =
  | "visit"
  | "catalog_view"
  | "try_open"
  | "try_run"
  | "try_submit"
  | "register_view"
  | "register_info"
  | "register_tg_open"
  | "register_manual"
  | "quiz_skip";

export type Source = "instagram" | "telegram" | "google" | "youtube" | "facebook" | "direct" | "other";

const read = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const write = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* e'tiborsiz */
  }
};

export function anonId(): string {
  let id = read("dr_aid");
  if (!id) {
    id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
    write("dr_aid", id);
  }
  return id;
}

function classify(raw: string): Source {
  const s = raw.toLowerCase();
  if (/instagram|ig\b|^ig$/.test(s)) return "instagram";
  if (/t\.me|telegram|^tg$/.test(s)) return "telegram";
  if (/google/.test(s)) return "google";
  if (/youtube|youtu\.be/.test(s)) return "youtube";
  if (/facebook|fb\.|^fb$|meta/.test(s)) return "facebook";
  return "other";
}

/** Birinchi kelgan manba saqlanadi: ?utm_source=... yoki referrer */
export function source(): Source {
  const saved = read("dr_src") as Source | null;
  if (saved) return saved;
  let src: Source = "direct";
  try {
    const p = new URLSearchParams(window.location.search);
    const utm = p.get("utm_source") || p.get("ref") || (p.get("fbclid") ? "facebook" : "");
    if (utm) src = classify(utm);
    else if (document.referrer && !document.referrer.startsWith(window.location.origin)) src = classify(new URL(document.referrer).hostname);
  } catch {
    /* e'tiborsiz */
  }
  write("dr_src", src);
  return src;
}

export function track(name: TrackEvent, extra: { taskId?: string } = {}) {
  try {
    const body = JSON.stringify({ name, anonId: anonId(), source: source(), ...extra });
    const url = `${API_URL}/events`;
    // text/plain — CORS'da oldindan so'rovsiz ("simple request") ketadi, sahifa yopilsa ham yetib boradi
    if (navigator.sendBeacon?.(url, new Blob([body], { type: "text/plain" }))) return;
    fetch(url, { method: "POST", headers: { "Content-Type": "text/plain" }, body, keepalive: true }).catch(() => undefined);
  } catch {
    /* e'tiborsiz */
  }
}

/** Kuniga bir marta "saytga kirdi" */
export function trackVisit() {
  const today = new Date().toISOString().slice(0, 10);
  source(); // manbani birinchi sahifadayoq aniqlab qo'yamiz (keyin utm yo'qoladi)
  if (read("dr_visit") === today) return;
  write("dr_visit", today);
  track("visit");
}

/** Ro'yxatdan o'tmasdan sinab ko'rilgan task: ro'yxatdan o'tgach shu yerga qaytariladi */
export const TRY_RETURN_KEY = "dr_try_return";
export const tryDraftKey = (taskId: string) => `devready-try:${taskId}`;
export function readTryReturn(): { taskId: string; track: string } | null {
  try {
    const v = JSON.parse(read(TRY_RETURN_KEY) || "null");
    return v?.taskId ? v : null;
  } catch {
    return null;
  }
}
export function setTryReturn(taskId: string, track: string) {
  write(TRY_RETURN_KEY, JSON.stringify({ taskId, track }));
}
/** Kirish/ro'yxatdan o'tishdan keyin qaytiladigan sahifa (masalan, /contests) */
export const RETURN_PATH_KEY = "dr_return_path";
export function setReturnPath(path: string) {
  write(RETURN_PATH_KEY, path);
}
/** Bir martalik: o'qilgach o'chiriladi. Faqat sayt ichidagi yo'l qabul qilinadi */
export function takeReturnPath(): string | null {
  const v = read(RETURN_PATH_KEY);
  try {
    localStorage.removeItem(RETURN_PATH_KEY);
  } catch {
    // e'tiborsiz
  }
  return v && v.startsWith("/") && !v.startsWith("//") ? v : null;
}
export function clearTryReturn() {
  try {
    localStorage.removeItem(TRY_RETURN_KEY);
  } catch {
    /* e'tiborsiz */
  }
}
