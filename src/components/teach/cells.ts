import type { CellStatus, ProgressCell, ReviewMode } from "../../types/type";

/** Nazorat jadvali va talaba sahifasi uchun katak holatlari: qisqa yozuv, izoh va rang */
export const CELL: Record<CellStatus, { label: string; hint: string; className: string }> = {
  approved: { label: "Qabul", hint: "Qabul qilingan", className: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  rejected: { label: "Rad", hint: "Rad etilgan — muddat ichida qayta urinishi mumkin", className: "bg-rose-50 text-rose-700 border-rose-200" },
  review: { label: "Baholash", hint: "Bahoingizni kutyapti", className: "bg-amber-50 text-amber-800 border-amber-200" },
  checking: { label: "AI", hint: "AI tekshirmoqda", className: "bg-brand-tint text-brand border-brand/20" },
  in_progress: { label: "Jarayonda", hint: "Boshlagan, hali yubormagan", className: "bg-surface text-ink-2 border-line" },
  not_started: { label: "—", hint: "Hali boshlamagan", className: "bg-surface text-muted border-dashed border-line" },
  missed: { label: "Topshirmadi", hint: "Muddat o'tdi, boshlamagan", className: "bg-rose-50/60 text-rose-700 border-dashed border-rose-200" },
  expired: { label: "Kechikdi", hint: "Boshlagan, lekin muddatida yubormagan", className: "bg-rose-50/60 text-rose-700 border-rose-200" },
};

/** Katakdagi asosiy yozuv: ball, "Baholash" yoki holat nomi */
export function cellText(c: ProgressCell) {
  if ((c.status === "approved" || c.status === "rejected") && c.score !== null && c.score !== undefined) return String(c.score);
  if (c.status === "review" && !c.needsTeacher) return "Mentorda";
  return CELL[c.status].label;
}

export const REVIEW_MODE: Record<ReviewMode, { label: string; hint: string }> = {
  ai: { label: "AI baholaydi", hint: "Yechim yuborilishi bilan AI baho va izoh beradi. Siz ustiga izoh qo'sha olasiz." },
  teacher: { label: "O'qituvchi baholaydi", hint: "Yechimni siz o'zingiz ko'rib, ball va izoh qo'yasiz." },
};

/** Muddatgacha qolgan vaqt: "3 kun", "5 soat", "40 daqiqa" yoki null (o'tgan) */
export function timeLeft(due: string, now = Date.now()) {
  const ms = new Date(due).getTime() - now;
  if (ms <= 0) return null;
  const min = Math.floor(ms / 60000);
  if (min < 60) return `${min} daqiqa`;
  const h = Math.floor(min / 60);
  if (h < 48) return `${h} soat`;
  return `${Math.floor(h / 24)} kun`;
}

/* Vaqtlar Toshkent vaqtida kiritiladi (UTC+5, yozgi vaqt yo'q) */
const TZ_OFFSET_MS = 5 * 3600 * 1000;
export const toLocalInput = (iso: string) => new Date(new Date(iso).getTime() + TZ_OFFSET_MS).toISOString().slice(0, 16);
export const fromLocalInput = (v: string) => new Date(`${v}:00+05:00`).toISOString();
/** N kundan keyin soat 23:59 (Toshkent) — muddat uchun qulay standart */
export function defaultDue(days = 7) {
  const d = new Date(Date.now() + TZ_OFFSET_MS + days * 86400000);
  return `${d.toISOString().slice(0, 10)}T23:59`;
}
