import { useEffect, useRef } from "react";
import { EditorView, basicSetup } from "codemirror";
import { EditorState, type Extension } from "@codemirror/state";
import { keymap } from "@codemirror/view";
import { indentWithTab } from "@codemirror/commands";
import { HighlightStyle, StreamLanguage, syntaxHighlighting, indentUnit } from "@codemirror/language";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { sql, PostgreSQL } from "@codemirror/lang-sql";
import { yaml } from "@codemirror/lang-yaml";
import { dockerFile } from "@codemirror/legacy-modes/mode/dockerfile";
import { nginx } from "@codemirror/legacy-modes/mode/nginx";
import { shell } from "@codemirror/legacy-modes/mode/shell";
import { tags as t } from "@lezer/highlight";

export type Lang = "html" | "css" | "js" | "ts" | "python" | "sql" | "yaml" | "dockerfile" | "nginx" | "shell" | "text";

const LANG: Record<Lang, () => Extension> = {
  html: () => html(),
  css: () => css(),
  js: () => javascript(),
  ts: () => javascript({ typescript: true }),
  python: () => python(),
  sql: () => sql({ dialect: PostgreSQL, upperCaseKeywords: true }),
  yaml: () => yaml(),
  dockerfile: () => StreamLanguage.define(dockerFile),
  nginx: () => StreamLanguage.define(nginx),
  shell: () => StreamLanguage.define(shell),
  text: () => [],
};

/** Muharrir ko'rinishi — DevReady tokenlaridan, shuning uchun yorug'/qorong'i mavzuga o'zi moslashadi */
const theme = EditorView.theme({
  "&": { height: "100%", fontSize: "13.5px", backgroundColor: "var(--color-surface)", color: "var(--color-ink)" },
  ".cm-scroller": { fontFamily: "var(--font-mono)", lineHeight: "1.65" },
  ".cm-content": { caretColor: "var(--color-brand)", padding: "10px 0" },
  ".cm-gutters": { backgroundColor: "var(--color-surface)", color: "var(--color-muted)", border: "none", paddingLeft: "6px" },
  ".cm-activeLine": { backgroundColor: "color-mix(in oklab, var(--color-brand) 6%, transparent)" },
  ".cm-activeLineGutter": { backgroundColor: "transparent", color: "var(--color-ink)" },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection": {
    backgroundColor: "color-mix(in oklab, var(--color-brand) 22%, transparent) !important",
  },
  ".cm-cursor": { borderLeftColor: "var(--color-brand)", borderLeftWidth: "2px" },
  ".cm-matchingBracket": { backgroundColor: "color-mix(in oklab, var(--color-brand) 18%, transparent)", outline: "none" },
  ".cm-tooltip": { backgroundColor: "var(--color-surface)", border: "1px solid var(--color-line)", borderRadius: "10px", overflow: "hidden" },
  ".cm-tooltip-autocomplete ul li[aria-selected]": { backgroundColor: "var(--color-brand)", color: "#fff" },
  ".cm-foldPlaceholder": { backgroundColor: "var(--color-mist)", border: "none", color: "var(--color-muted)" },
});

const highlight = HighlightStyle.define([
  { tag: [t.keyword, t.controlKeyword, t.moduleKeyword], color: "var(--sb-keyword)" },
  { tag: [t.string, t.special(t.string), t.attributeValue], color: "var(--sb-string)" },
  { tag: [t.number, t.bool, t.null, t.atom], color: "var(--sb-number)" },
  { tag: [t.comment, t.lineComment, t.blockComment], color: "var(--color-muted)", fontStyle: "italic" },
  { tag: [t.tagName, t.typeName, t.className], color: "var(--sb-tag)" },
  { tag: [t.attributeName, t.propertyName], color: "var(--sb-attr)" },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: "var(--sb-fn)" },
  { tag: [t.variableName, t.definition(t.variableName)], color: "var(--color-ink)" },
  { tag: [t.operator, t.punctuation, t.bracket, t.angleBracket], color: "var(--color-ink-2)" },
  { tag: [t.unit, t.color], color: "var(--sb-number)" },
]);

/**
 * Bir nechta fayl uchun bitta muharrir: har bir faylning holati (matn, tarix, kursor) alohida saqlanadi,
 * tab almashganda shu holat qaytariladi.
 */
export default function CodeEditor({
  file,
  lang,
  value,
  onChange,
  readOnly = false,
}: {
  file: string;
  lang: Lang;
  value: string;
  onChange?: (v: string) => void;
  readOnly?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const states = useRef(new Map<string, EditorState>());
  const change = useRef(onChange);
  useEffect(() => {
    change.current = onChange;
  }, [onChange]);

  const make = (doc: string, l: Lang) =>
    EditorState.create({
      doc,
      extensions: [
        basicSetup,
        keymap.of([indentWithTab]),
        indentUnit.of(l === "python" ? "    " : "  "),
        EditorState.tabSize.of(l === "python" ? 4 : 2),
        LANG[l](),
        theme,
        syntaxHighlighting(highlight),
        EditorView.lineWrapping,
        EditorState.readOnly.of(readOnly),
        EditorView.editable.of(!readOnly),
        EditorView.contentAttributes.of({ "aria-label": `${file} fayli` }),
        EditorView.updateListener.of((u) => {
          if (u.docChanged) change.current?.(u.state.doc.toString());
        }),
      ],
    });

  useEffect(() => {
    if (!host.current) return;
    const v = new EditorView({ state: make(value, lang), parent: host.current });
    view.current = v;
    states.current.set(file, v.state);
    return () => v.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tab almashganda: joriy holatni saqlab, yangisini tiklaymiz
  const prevFile = useRef(file);
  useEffect(() => {
    const v = view.current;
    if (!v || prevFile.current === file) return;
    states.current.set(prevFile.current, v.state);
    v.setState(states.current.get(file) || make(value, lang));
    prevFile.current = file;
    v.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  // Tashqaridan qiymat almashsa (masalan "Boshlang'ich kodga qaytarish")
  useEffect(() => {
    const v = view.current;
    if (v && v.state.doc.toString() !== value && prevFile.current === file) {
      v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: value } });
    }
  }, [value, file]);

  return <div ref={host} className="h-full overflow-hidden [&_.cm-editor]:h-full [&_.cm-editor.cm-focused]:outline-none" />;
}
