import type { ReactNode } from "react";

/**
 * Maqolalar uchun xavfsiz, kichik Markdown renderer (HTML qabul qilinmaydi — hammasi React elementlari):
 *   ## / ### sarlavha, - ro'yxat, 1. raqamli ro'yxat, > iqtibos, ``` kod bloki,
 *   **qalin**, `kod`, [matn](https://havola)
 */
// eslint-disable-next-line react-refresh/only-export-components
export function stripMarkdown(text: string) {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*(?:[-*]|\d+\.)\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

/** Sarlavhadan anchor id (o'zbekcha apostroflar olib tashlanadi) */
// eslint-disable-next-line react-refresh/only-export-components
export function slugify(text: string) {
  return stripMarkdown(text)
    .toLowerCase()
    .replace(/[‘’'`ʻʼ]/g, "")
    .replace(/[^a-z0-9\u0400-\u04ff]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Mundarija uchun ## sarlavhalar ro'yxati */
// eslint-disable-next-line react-refresh/only-export-components
export function markdownHeadings(text: string) {
  const out: { id: string; title: string }[] = [];
  let inCode = false;
  for (const line of text.replace(/\r\n/g, "\n").split("\n")) {
    if (line.startsWith("```")) inCode = !inCode;
    const m = !inCode && line.match(/^##\s+(.*)$/);
    if (m) out.push({ id: slugify(m[1]), title: stripMarkdown(m[1]) });
  }
  return out;
}

function inline(text: string, key: string, codeClass = CODE_ARTICLE): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\(https?:\/\/[^)\s]+\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const t = m[0];
    const k = `${key}-${i++}`;
    if (t.startsWith("**")) out.push(<strong key={k} className="font-semibold text-ink">{t.slice(2, -2)}</strong>);
    else if (t.startsWith("`"))
      out.push(
        <code key={k} className={codeClass}>
          {t.slice(1, -1)}
        </code>,
      );
    else {
      const [, label, href] = t.match(/\[([^\]]+)\]\(([^)]+)\)/) || [];
      out.push(
        <a key={k} href={href} target="_blank" rel="noopener noreferrer" className="text-brand underline underline-offset-4">
          {label}
        </a>,
      );
    }
    last = m.index + t.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

const CODE_ARTICLE = "px-1.5 py-0.5 rounded-md bg-mist border border-line font-mono text-[0.88em] text-ink";
const CODE_COMPACT = "px-1 py-px rounded bg-mist font-mono text-[0.86em] text-ink [box-decoration-break:clone]";

/** Ikki o'lcham: maqola (blog) va ixcham (task shartlari, modal, yon panel) */
const SIZES = {
  article: {
    pre: "mb-7 rounded-2xl bg-night text-white/90 border border-line p-5 sm:p-6 overflow-x-auto text-[14px] leading-relaxed font-mono",
    h2: "scroll-mt-24 mt-14 mb-4 text-[24px] sm:text-[28px] font-bold tracking-[-0.025em] leading-tight text-ink text-balance",
    h3: "mt-9 mb-3 text-[20px] font-bold tracking-[-0.015em] text-ink",
    quote: "my-9 rounded-2xl bg-brand-tint px-6 py-5 sm:px-7 sm:py-6 text-[17px] sm:text-lg leading-[1.7] text-ink",
    list: "mb-7 pl-6 flex flex-col gap-2.5 text-[17px] sm:text-lg leading-[1.7] text-ink-2 marker:text-muted",
    lead: "mb-8 text-[19px] sm:text-[21px] leading-[1.65] text-ink tracking-[-0.01em]",
    p: "mb-6 text-[17px] sm:text-lg leading-[1.75] text-ink-2",
  },
  compact: {
    pre: "mb-4 rounded-xl bg-night text-white/90 p-3.5 overflow-x-auto text-[12.5px] leading-relaxed font-mono",
    h2: "mt-6 first:mt-0 mb-2 text-[15px] font-bold text-ink",
    h3: "mt-4 mb-1.5 text-[14px] font-semibold text-ink",
    quote: "mb-4 rounded-xl bg-brand-tint px-4 py-3 text-[14px] leading-relaxed text-ink",
    list: "mb-4 pl-5 flex flex-col gap-1.5 text-[14px] leading-relaxed text-ink-2 marker:text-muted",
    lead: "mb-4 text-[15px] leading-relaxed text-ink",
    p: "mb-3 text-[14px] leading-relaxed text-ink-2",
  },
} as const;

/** lead=true bo'lsa birinchi xatboshi kattaroq (kirish) ko'rinishda chiqadi; size="compact" — task shartlari uchun */
export default function Markdown({ text, lead = false, size = "article" }: { text: string; lead?: boolean; size?: keyof typeof SIZES }) {
  const S = SIZES[size];
  const code = size === "compact" ? CODE_COMPACT : CODE_ARTICLE;
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let n = 0;
  const key = () => `b${n++}`;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) code.push(lines[i++]);
      i++;
      blocks.push(
        <pre key={key()} className={S.pre} aria-label={lang || "kod"}>
          <code>{code.join("\n")}</code>
        </pre>,
      );
      continue;
    }
    const h = line.match(/^(#{2,3})\s+(.*)$/);
    if (h) {
      const k = key();
      blocks.push(
        h[1].length === 2 ? (
          <h2 key={k} id={slugify(h[2])} className={S.h2}>
            {inline(h[2], k, code)}
          </h2>
        ) : (
          <h3 key={k} className={S.h3}>{inline(h[2], k, code)}</h3>
        ),
      );
      i++;
      continue;
    }
    if (/^>\s?/.test(line)) {
      const q: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) q.push(lines[i++].replace(/^>\s?/, ""));
      const k = key();
      blocks.push(
        <blockquote key={k} className={S.quote}>
          {inline(q.join(" "), k, code)}
        </blockquote>,
      );
      continue;
    }
    const ul = /^\s*[-*]\s+/;
    const ol = /^\s*\d+\.\s+/;
    if (ul.test(line) || ol.test(line)) {
      const ordered = ol.test(line);
      const re = ordered ? ol : ul;
      const items: string[] = [];
      while (i < lines.length && re.test(lines[i])) items.push(lines[i++].replace(re, ""));
      const k = key();
      const cls = S.list;
      blocks.push(
        ordered ? (
          <ol key={k} className={`${cls} list-decimal`}>
            {items.map((it, j) => (
              <li key={j}>{inline(it, `${k}-${j}`, code)}</li>
            ))}
          </ol>
        ) : (
          <ul key={k} className={`${cls} list-disc`}>
            {items.map((it, j) => (
              <li key={j}>{inline(it, `${k}-${j}`, code)}</li>
            ))}
          </ul>
        ),
      );
      continue;
    }
    const k = key();
    const isLead = lead && !blocks.length;
    blocks.push(
      <p key={k} className={isLead ? S.lead : S.p}>
        {inline(line, k, code)}
      </p>,
    );
    i++;
  }
  return <>{blocks}</>;
}
