// SEO uchun umumiy qiymatlar va structured data yordamchilari
/** Saytning ommaviy manzili (canonical va og:url uchun) */
export const SITE_URL = (import.meta.env.VITE_SITE_URL || "https://devready.uz").replace(/\/$/, "");
export const SITE_NAME = "DevReady";
export const DEFAULT_TITLE = "DevReady — amaliy tasklar va mentor tekshiruvi bilan dasturchi bo'ling";
export const DEFAULT_DESCRIPTION =
  "Real loyihalarga o'xshash tasklarni vaqt bilan bajaring, mentor va AI kodingizni tekshiradi. Frontend, backend va boshqa yo'nalishlarda portfolio yig'ing va texnik suhbatga tayyorlaning.";
export const DEFAULT_IMAGE = `${SITE_URL}/og-image.png`;

export type JsonLd = Record<string, unknown>;

/** Breadcrumb structured data (Google natijada yo'lni ko'rsatadi) */
export function breadcrumbs(items: { name: string; path: string }[]): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: `${SITE_URL}${it.path}` })),
  };
}
