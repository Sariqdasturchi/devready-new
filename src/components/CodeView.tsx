import { useMemo, type ReactNode } from "react";
import { highlightCode, classHighlighter } from "@lezer/highlight";
import { javascriptLanguage, jsxLanguage, typescriptLanguage } from "@codemirror/lang-javascript";
import { PostgreSQL } from "@codemirror/lang-sql";
import { cssLanguage } from "@codemirror/lang-css";
import { htmlLanguage } from "@codemirror/lang-html";
import { pythonLanguage } from "@codemirror/lang-python";
import type { Parser } from "@lezer/common";
import type { QuestionLang } from "../types/type";

const PARSERS: Partial<Record<QuestionLang, () => Parser>> = {
  js: () => javascriptLanguage.parser,
  jsx: () => jsxLanguage.parser,
  ts: () => typescriptLanguage.parser,
  sql: () => PostgreSQL.language.parser,
  css: () => cssLanguage.parser,
  html: () => htmlLanguage.parser,
  python: () => pythonLanguage.parser,
};

// classHighlighter klasslari → ranglar (qorong'i fonda o'qiladigan, kontrast yetarli)
const TOKEN_COLOR: [RegExp, string][] = [
  [/tok-comment/, "text-white/45 italic"],
  [/tok-keyword|tok-operatorKeyword|tok-modifier/, "text-[#ff9ac1]"],
  [/tok-string|tok-regexp/, "text-[#a5e3a0]"],
  [/tok-number|tok-bool|tok-atom|tok-null/, "text-[#ffc66d]"],
  [/tok-definition|tok-function/, "text-[#8ec5ff]"],
  [/tok-propertyName|tok-attributeName/, "text-[#c4b5fd]"],
  [/tok-typeName|tok-className|tok-tagName/, "text-[#7dd3fc]"],
];

function colorFor(classes: string) {
  for (const [re, c] of TOKEN_COLOR) if (re.test(classes)) return c;
  return "";
}

/**
 * O'qish uchun kod bloki (muharrir emas): ko'p qatorli, monospace, sintaksis ranglari bilan.
 * Daraja testi savollaridagi kod uchun — avval kod bir qatorga oddiy matn bo'lib chiqardi.
 */
export default function CodeView({ code, lang = "", className = "" }: { code: string; lang?: QuestionLang; className?: string }) {
  const nodes = useMemo(() => {
    const parser = PARSERS[lang]?.();
    if (!parser) return [code] as ReactNode[];
    const out: ReactNode[] = [];
    let k = 0;
    try {
      highlightCode(
        code,
        parser.parse(code),
        classHighlighter,
        (text, classes) => {
          const c = classes && colorFor(classes);
          out.push(c ? <span key={k++} className={c}>{text}</span> : text);
        },
        () => out.push("\n"),
      );
      return out;
    } catch {
      return [code] as ReactNode[];
    }
  }, [code, lang]);

  return (
    <pre
      className={`rounded-xl bg-night text-white/90 px-4 py-3.5 overflow-x-auto text-[13.5px] leading-[1.65] font-mono ${className}`}
      aria-label={lang ? `${lang} kod` : "kod"}
    >
      <code>{nodes}</code>
    </pre>
  );
}
