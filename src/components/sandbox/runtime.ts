/**
 * Sandbox ish vaqti: talaba kodidan iframe uchun HTML yig'adi, konsolni va testlarni
 * ota sahifaga postMessage orqali uzatadi. iframe sandbox="allow-scripts allow-forms allow-modals" (same-origin YO‘Q) —
 * talaba kodi saytning cookie/localStorage/token'iga kira olmaydi.
 */
export type SandboxFiles = { html: string; css: string; js: string };
export type SandboxTest = { title: string; code: string };
export type TestResult = { title: string; ok: boolean; error?: string; ms?: number };
export type ConsoleLine = { level: "log" | "warn" | "error" | "info"; text: string };

export const MSG = "devready-sandbox";

export const SANDBOX_FILES: { key: keyof SandboxFiles; name: string; lang: "html" | "css" | "js" }[] = [
  { key: "html", name: "index.html", lang: "html" },
  { key: "css", name: "style.css", lang: "css" },
  { key: "js", name: "script.js", lang: "js" },
];

/** iframe ichida ishlaydigan ko'prik: konsol, xatolar va test bajaruvchi */
const BRIDGE = String.raw`
(function () {
  var send = function (data) { data.source = "${MSG}"; parent.postMessage(data, "*"); };
  var fmt = function (v) {
    if (typeof v === "string") return v;
    if (v instanceof Error) return v.name + ": " + v.message;
    try { return JSON.stringify(v, null, 1); } catch (e) { return String(v); }
  };
  ["log", "info", "warn", "error"].forEach(function (lvl) {
    var orig = console[lvl];
    console[lvl] = function () {
      send({ type: "console", level: lvl, text: Array.prototype.map.call(arguments, fmt).join(" ") });
      orig && orig.apply(console, arguments);
    };
  });
  window.addEventListener("error", function (e) {
    send({ type: "console", level: "error", text: (e.message || "Xatolik") + (e.lineno ? " (" + e.lineno + "-qator)" : "") });
  });
  // Forma yuborilsa iframe boshqa sahifaga ketib qolmasin — talabaga maslahat beramiz
  window.addEventListener("submit", function (e) {
    if (e.defaultPrevented) return;
    e.preventDefault();
    send({ type: "console", level: "warn", text: "Forma yuborildi va sahifa qayta yuklanishi kerak edi. Ishlovchida e.preventDefault() chaqiring." });
  });
  window.addEventListener("unhandledrejection", function (e) { send({ type: "console", level: "error", text: "Promise: " + fmt(e.reason) }); });

  // ── Test yordamchilari ──
  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  var wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms || 50); }); };
  var assert = function (cond, msg) { if (!cond) throw new Error(msg || "Shart bajarilmadi"); };
  var text = function (s) { var el = $(s); assert(el, s + " topilmadi"); return (el.textContent || "").replace(/\s+/g, " ").trim(); };
  var click = function (s) { var el = $(s); assert(el, s + " topilmadi"); el.click(); return wait(60); };
  var style = function (s, prop) { var el = $(s); assert(el, s + " topilmadi"); return getComputedStyle(el).getPropertyValue(prop); };
  var AsyncFn = Object.getPrototypeOf(async function () {}).constructor;

  window.addEventListener("message", async function (e) {
    if (!e.data || e.data.source !== "${MSG}-host" || e.data.type !== "run-tests") return;
    var results = [];
    for (var i = 0; i < e.data.tests.length; i++) {
      var t = e.data.tests[i], t0 = performance.now();
      try {
        var fn = new AsyncFn("$", "$$", "click", "wait", "assert", "text", "style", t.code);
        await Promise.race([
          fn($, $$, click, wait, assert, text, style),
          new Promise(function (_, rej) { setTimeout(function () { rej(new Error("Vaqt tugadi (2 s)")); }, 2000); })
        ]);
        results.push({ title: t.title, ok: true, ms: Math.round(performance.now() - t0) });
      } catch (err) {
        results.push({ title: t.title, ok: false, error: err && err.message ? err.message : String(err), ms: Math.round(performance.now() - t0) });
      }
    }
    send({ type: "test-results", results: results });
  });
  window.addEventListener("load", function () { send({ type: "ready" }); });
})();
`;

const esc = (s: string) => s.replace(/<\/script/gi, "<\\/script");

/** Talaba fayllaridan to'liq HTML hujjat */
export function buildDocument(files: SandboxFiles) {
  const head = `<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><script>${BRIDGE}</script><style>${files.css}</style>`;
  const script = `<script>${esc(files.js)}\n//# sourceURL=script.js</script>`;
  const body = files.html;
  if (/<html[\s>]/i.test(body)) {
    // To'liq hujjat yozilgan bo'lsa — head va body oxiriga qo'shamiz
    let doc = /<\/head>/i.test(body) ? body.replace(/<\/head>/i, `${head}</head>`) : body.replace(/<html[^>]*>/i, (m) => `${m}<head>${head}</head>`);
    doc = /<\/body>/i.test(doc) ? doc.replace(/<\/body>/i, `${script}</body>`) : `${doc}${script}`;
    return doc;
  }
  return `<!doctype html><html lang="uz"><head>${head}</head><body>${body}${script}</body></html>`;
}
