import { useEffect, useState } from "react";

/** Foydalanuvchi tanlovi: yorug' / qorong'i / tizim sozlamasi bo'yicha */
export type ThemePref = "light" | "dark" | "system";
export type Theme = "light" | "dark";

const KEY = "devready-theme";
const media = () => window.matchMedia("(prefers-color-scheme: dark)");

export function getPref(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

export function resolve(pref: ThemePref): Theme {
  return pref === "system" ? (media().matches ? "dark" : "light") : pref;
}

/** <html> ga sinf qo'yadi va brauzer paneli rangini moslaydi */
export function apply(theme: Theme, animate = false) {
  const root = document.documentElement;
  if (animate) {
    root.classList.add("theme-switching");
    window.setTimeout(() => root.classList.remove("theme-switching"), 300);
  }
  root.classList.toggle("dark", theme === "dark");
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#0a0d16" : "#ffffff");
  window.dispatchEvent(new CustomEvent("devready-theme", { detail: theme }));
}

export function setPref(pref: ThemePref) {
  try {
    if (pref === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, pref);
  } catch {
    /* saqlab bo'lmasa ham mavzu shu sessiyada ishlaydi */
  }
  apply(resolve(pref), true);
}

/** Joriy mavzu (o'zgarsa komponent qayta chiziladi — grafik ranglari uchun) */
export function useTheme() {
  const [pref, setPrefState] = useState<ThemePref>(getPref);
  const [theme, setTheme] = useState<Theme>(() => (document.documentElement.classList.contains("dark") ? "dark" : "light"));

  useEffect(() => {
    const onTheme = (e: Event) => setTheme((e as CustomEvent<Theme>).detail);
    const mq = media();
    const onSystem = () => {
      if (getPref() === "system") apply(resolve("system"), true);
    };
    window.addEventListener("devready-theme", onTheme);
    mq.addEventListener("change", onSystem);
    return () => {
      window.removeEventListener("devready-theme", onTheme);
      mq.removeEventListener("change", onSystem);
    };
  }, []);

  const choose = (p: ThemePref) => {
    setPrefState(p);
    setPref(p);
  };
  // Tugma uchun: yorug' ↔ qorong'i (tizimdagi holatdan qarama-qarshisiga)
  const toggle = () => choose(theme === "dark" ? "light" : "dark");
  return { theme, pref, choose, toggle };
}

/** Grafiklar (Recharts) uchun ranglar — SVG atributlarida CSS o'zgaruvchisi ishlamaydi */
export function useChartColors() {
  const { theme } = useTheme();
  const dark = theme === "dark";
  return {
    brand: dark ? "#3d63ff" : "#1f4bff",
    brandSoft: dark ? "#6c88ff" : "#9db1ff",
    ink: dark ? "#e8ecf5" : "#0b1020",
    muted: dark ? "#8791a7" : "#667085",
    grid: dark ? "#1c2333" : "#eef1f6",
    cursor: dark ? "rgba(61,99,255,0.12)" : "rgba(31,75,255,0.06)",
    tooltip: {
      background: dark ? "#121725" : "#ffffff",
      border: `1px solid ${dark ? "#252d40" : "#e2e7f0"}`,
      color: dark ? "#e8ecf5" : "#0b1020",
      borderRadius: 12,
      fontSize: 12,
      boxShadow: dark ? "0 8px 24px -8px rgba(0,0,0,0.6)" : "0 8px 24px -8px rgba(11,16,32,0.18)",
    },
  };
}
