import type { Difficulty, TaskStatus } from "../types/type";

export const TRACKS = [
  "Frontend",
  "Backend",
  "Fullstack",
  "Mobile",
  "UI/UX",
  "Graphic Design",
  "Database",
  "DevOps",
  "QA",
] as const;

export const LEVELS = ["Beginner", "Junior", "Strong Junior", "Middle"] as const;

export const DIFFICULTY: Record<Difficulty, { label: string; className: string; minutes: number }> = {
  oson: { label: "Oson", className: "text-ink-2 bg-white border-line", minutes: 120 },
  orta: { label: "O'rta", className: "text-ink-2 bg-white border-line", minutes: 360 },
  qiyin: { label: "Qiyin", className: "text-white bg-ink border-ink", minutes: 1440 },
};

export type Tone = "neutral" | "info" | "warning" | "success" | "danger" | "violet";

export const STATUS: Record<TaskStatus, { label: string; tone: Tone }> = {
  not_started: { label: "Yangi", tone: "neutral" },
  in_progress: { label: "Bajarilmoqda", tone: "info" },
  pending: { label: "AI navbatda", tone: "violet" },
  ai_checking: { label: "AI tekshirmoqda", tone: "violet" },
  ai_checked: { label: "AI tekshirdi", tone: "violet" },
  under_review: { label: "Mentor tekshirmoqda", tone: "warning" },
  approved: { label: "Qabul qilindi", tone: "success" },
  rejected: { label: "Rad etildi", tone: "danger" },
  expired: { label: "Bajarilmagan", tone: "danger" },
};

export const IN_REVIEW: TaskStatus[] = ["pending", "ai_checking", "ai_checked", "under_review"];

export const TONE_CLASS: Record<Tone, string> = {
  neutral: "text-ink-2 bg-mist border-line",
  info: "text-brand bg-brand-tint border-brand/20",
  warning: "text-amber-800 bg-amber-50 border-amber-200",
  success: "text-emerald-800 bg-emerald-50 border-emerald-200",
  danger: "text-rose-700 bg-rose-50 border-rose-200",
  violet: "text-ink bg-white border-ink/20",
};

export const BOT_USERNAME = "devreadyrobot";
export const SUPPORT_USERNAME = "devreadyadmin";
