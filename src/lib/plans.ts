import type { Plan } from "../types/type";
import { formatPrice } from "./format";

const unlimited = (n?: number | null) => n === -1 || n === null || n === undefined;

export type PlanLine = { text: string; included: boolean };

/**
 * Tarif afzalliklari — limitlardan avtomatik yasaladi, shuning uchun admin kiritgan
 * raqamlar bilan har doim mos keladi. Admin qo'shgan qo'shimcha qatorlar oxirida.
 */
export function planLines(plan: Plan): PlanLine[] {
  // Bepul tarif limiti butun davr uchun (oyma-oy yangilanmaydi), pullik — tarif muddati ichida
  const period = !plan.price ? "Jami" : plan.duration ? `${plan.duration} kunda` : "Jami";
  const lines: PlanLine[] = [
    {
      text: unlimited(plan.taskLimit) ? "Cheksiz task — xohlagancha amaliyot" : `${period} ${plan.taskLimit} ta task`,
      included: true,
    },
    {
      text: unlimited(plan.mentorReviewsIncluded)
        ? "Har bir yechimga mentor review"
        : plan.mentorReviewsIncluded > 0
          ? `${plan.price && plan.duration ? `${plan.duration} kunda ` : "Jami "}${plan.mentorReviewsIncluded} ta mentor review`
          : "Mentor review",
      included: unlimited(plan.mentorReviewsIncluded) || plan.mentorReviewsIncluded > 0,
    },
    { text: "AI kod tahlili — bir necha daqiqada baho", included: !!plan.aiReviewEnabled },
  ];
  // Task, mentor va AI qatorlari limitlardan yasaladi — admin yozgan shu mavzudagi qatorlar takrorlanmasin
  const auto = /\btask|mentor|\bAI\b|review|tekshiruv/i;
  const extra = (plan.features || []).map((t) => t?.trim()).filter((t): t is string => !!t && !auto.test(t));
  return [...lines, ...extra.map((text) => ({ text, included: true }))];
}

/** Bitta task narxi (cheklangan pullik tariflarda) — tanlashni osonlashtiradi */
export function pricePerTask(plan: Plan): string | null {
  if (!plan.price || unlimited(plan.taskLimit) || !plan.taskLimit) return null;
  return `1 task ≈ ${formatPrice(Math.round(plan.price / plan.taskLimit / 100) * 100)}`;
}

/** Kimga mos — admin tavsif yozmagan bo'lsa, limitlardan kelib chiqib */
export function planAudience(plan: Plan, all: Plan[]): string {
  if (plan.description?.trim()) return plan.description.trim();
  if (!plan.price) return "Platformani sinab ko'rish va birinchi tasklarni bajarish uchun.";
  const top = isTopPlan(plan, all);
  if (top) return "Suhbatga jadal tayyorlanayotganlar uchun: eng ko'p task va mentor tekshiruvi.";
  return "Muntazam amaliyot qilib, ko'nikmani bosqichma-bosqich oshirish uchun.";
}

/** Eng qimmat faol tarif — "Eng to'liq" deb belgilanadi */
export function isTopPlan(plan: Plan, all: Plan[]): boolean {
  const paid = all.filter((p) => p.price > 0);
  return paid.length > 1 && plan.price === Math.max(...paid.map((p) => p.price));
}

/** Taqqoslash jadvali qatorlari */
export function comparisonRows(plans: Plan[]) {
  const lim = (n: number) => (unlimited(n) ? "Cheksiz" : n > 0 ? String(n) : "—");
  return [
    { label: "Narx", values: plans.map((p) => (p.price ? `${formatPrice(p.price)}` : "Bepul")) },
    { label: "Muddat", values: plans.map((p) => (p.duration ? `${p.duration} kun` : "Doimiy")) },
    { label: "Tasklar", values: plans.map((p) => lim(p.taskLimit)) },
    { label: "Mentor review", values: plans.map((p) => lim(p.mentorReviewsIncluded)) },
    { label: "AI kod tahlili", values: plans.map((p) => (p.aiReviewEnabled ? "Bor" : "—")) },
    { label: "1 task narxi", values: plans.map((p) => (!p.price ? "Bepul" : unlimited(p.taskLimit) ? "Cheklanmagan" : pricePerTask(p)?.replace("1 task ≈ ", "") || "—")) },
  ];
}
