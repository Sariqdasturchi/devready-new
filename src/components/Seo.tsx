import { useEffect } from "react";
import { useLocation } from "react-router-dom";

import { DEFAULT_DESCRIPTION, DEFAULT_IMAGE, DEFAULT_TITLE, SITE_NAME, SITE_URL, type JsonLd } from "../lib/seo";

type SeoProps = {
  /** Sahifa sarlavhasi; " — DevReady" avtomatik qo'shiladi (title=undefined bo'lsa — standart) */
  title?: string;
  description?: string;
  /** Joriy yo'l o'rniga boshqa canonical yo'l (masalan, /blogs/<slug>) */
  path?: string;
  image?: string;
  type?: "website" | "article";
  /** Kabinet, kirish va 404 sahifalari qidiruvga chiqmasin */
  noindex?: boolean;
  jsonLd?: JsonLd | JsonLd[];
  article?: { publishedTime?: string; modifiedTime?: string; tags?: string[] };
};

const absolute = (url: string) => (/^https?:\/\//.test(url) ? url : `${SITE_URL}${url.startsWith("/") ? "" : "/"}${url}`);

/** <head> dagi tegni topadi yoki yaratadi (index.html dagi standart teglar shu yerda yangilanadi — dublikat bo'lmaydi) */
function upsert(selector: string, create: () => HTMLElement, set: (el: HTMLElement) => void) {
  let el = document.head.querySelector<HTMLElement>(selector);
  if (!el) {
    el = create();
    el.setAttribute("data-seo", "");
    document.head.appendChild(el);
  }
  set(el);
}

function meta(attr: "name" | "property", key: string, content?: string) {
  const selector = `meta[${attr}="${key}"]`;
  if (content === undefined || content === "") {
    document.head.querySelector(`${selector}[data-seo]`)?.remove();
    return;
  }
  upsert(
    selector,
    () => {
      const m = document.createElement("meta");
      m.setAttribute(attr, key);
      return m;
    },
    (el) => el.setAttribute("content", content),
  );
}

export default function Seo({ title, description = DEFAULT_DESCRIPTION, path, image = DEFAULT_IMAGE, type = "website", noindex = false, jsonLd, article }: SeoProps) {
  const { pathname } = useLocation();
  const url = `${SITE_URL}${path ?? pathname}`.replace(/(.)\/$/, "$1");
  const fullTitle = title ? `${title} — ${SITE_NAME}` : DEFAULT_TITLE;
  const img = absolute(image);
  const ld = JSON.stringify(jsonLd ?? null);
  const tags = (article?.tags || []).join("|");

  useEffect(() => {
    document.title = fullTitle;
    meta("name", "description", description);
    meta("name", "robots", noindex ? "noindex, nofollow" : "index, follow, max-image-preview:large");

    upsert(
      'link[rel="canonical"]',
      () => {
        const l = document.createElement("link");
        l.rel = "canonical";
        return l;
      },
      (el) => el.setAttribute("href", url),
    );

    meta("property", "og:type", type);
    meta("property", "og:title", title || DEFAULT_TITLE);
    meta("property", "og:description", description);
    meta("property", "og:url", url);
    meta("property", "og:image", img);
    meta("property", "og:image:alt", title || SITE_NAME);
    meta("name", "twitter:title", title || DEFAULT_TITLE);
    meta("name", "twitter:description", description);
    meta("name", "twitter:image", img);

    meta("property", "article:published_time", article?.publishedTime);
    meta("property", "article:modified_time", article?.modifiedTime);
    document.head.querySelectorAll('meta[property="article:tag"]').forEach((m) => m.remove());
    for (const t of tags ? tags.split("|") : []) {
      const m = document.createElement("meta");
      m.setAttribute("property", "article:tag");
      m.setAttribute("content", t);
      m.setAttribute("data-seo", "");
      document.head.appendChild(m);
    }

    // Sahifaga xos structured data (umumiy Organization/WebSite index.html da)
    document.head.querySelector("script[data-seo-ld]")?.remove();
    if (ld !== "null") {
      const s = document.createElement("script");
      s.type = "application/ld+json";
      s.setAttribute("data-seo-ld", "");
      s.textContent = ld;
      document.head.appendChild(s);
    }
  }, [fullTitle, title, description, url, img, type, noindex, ld, tags, article?.publishedTime, article?.modifiedTime]);

  return null;
}
