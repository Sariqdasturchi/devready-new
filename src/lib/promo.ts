/**
 * Promokod havolasi: devready.uz/...?promo=KANAL40 — kod 14 kun eslab qolinadi
 * (ro'yxatdan o'tish va kirishdan keyin ham) va to'lov oynasida avtomatik qo'yiladi.
 */
const KEY = "devready-promo";
const TTL = 14 * 24 * 3600 * 1000;

export function capturePromoFromUrl() {
  try {
    const code = new URLSearchParams(window.location.search).get("promo");
    if (code && /^[A-Za-z0-9_-]{3,30}$/.test(code.trim())) {
      localStorage.setItem(KEY, JSON.stringify({ code: code.trim().toUpperCase(), at: Date.now() }));
    }
  } catch {
    /* saqlab bo'lmasa — kodni qo'lda kiritadi */
  }
}

export function getStoredPromo(): string | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const { code, at } = JSON.parse(raw);
    if (!code || Date.now() - Number(at) > TTL) {
      localStorage.removeItem(KEY);
      return null;
    }
    return String(code);
  } catch {
    return null;
  }
}

export function clearStoredPromo() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* e'tiborsiz */
  }
}

export const promoLink = (code: string, path = "/pricing") => `${window.location.origin}${path}?promo=${encodeURIComponent(code)}`;
