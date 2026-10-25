/**
 * Sandbox ish vaqti: talaba kodidan iframe uchun HTML yig'adi, konsolni va testlarni
 * ota sahifaga postMessage orqali uzatadi. iframe sandbox="allow-scripts allow-forms allow-modals" (same-origin YO‘Q) —
 * talaba kodi saytning cookie/localStorage/token'iga kira olmaydi.
 */
export type SandboxFiles = { html: string; css: string; js: string; server?: string };
export type SandboxTest = { title: string; code: string };
export type TestResult = { title: string; ok: boolean; error?: string; ms?: number };
export type ConsoleLine = { level: "log" | "warn" | "error" | "info"; text: string };

export const MSG = "devready-sandbox";

export const SANDBOX_FILES: { key: keyof SandboxFiles; name: string; lang: "html" | "css" | "js" }[] = [
  { key: "html", name: "index.html", lang: "html" },
  { key: "css", name: "style.css", lang: "css" },
  { key: "js", name: "script.js", lang: "js" },
];
export const SERVER_FILE = { key: "server" as const, name: "server.js", lang: "js" as const };

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
  // Inputga qiymat yozish (input/change hodisalari bilan) va formani yuborish
  var type = function (s, value) {
    var el = $(s); assert(el, s + " topilmadi");
    var proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : el.tagName === "SELECT" ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    var setter = Object.getOwnPropertyDescriptor(proto, "value");
    setter && setter.set ? setter.set.call(el, value) : (el.value = value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    return wait(30);
  };
  var submit = function (s) {
    var el = $(s); assert(el, s + " topilmadi");
    var form = el.tagName === "FORM" ? el : el.form || el.closest("form"); assert(form, s + " forma emas");
    form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    return wait(120);
  };
  // Shart bajarilguncha kutish (fetch javobi kabi asinxron o'zgarishlar uchun)
  var until = async function (fn, ms, msg) {
    var end = performance.now() + (ms || 1200);
    while (performance.now() < end) { try { if (await fn()) return true; } catch (e) {} await wait(40); }
    throw new Error(msg || "Kutilgan holat yuz bermadi");
  };
  var AsyncFn = Object.getPrototypeOf(async function () {}).constructor;

  window.addEventListener("message", async function (e) {
    if (!e.data || e.data.source !== "${MSG}-host" || e.data.type !== "run-tests") return;
    var results = [];
    for (var i = 0; i < e.data.tests.length; i++) {
      var t = e.data.tests[i], t0 = performance.now();
      try {
        var fn = new AsyncFn("$", "$$", "click", "wait", "assert", "text", "style", "type", "submit", "until", t.code);
        await Promise.race([
          fn($, $$, click, wait, assert, text, style, type, submit, until),
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

/**
 * Fullstack: server.js dagi handle(request) funksiyasi — fetch("/api/...") so'rovlari shu yerga tushadi.
 * Server kodi alohida doirada (IIFE) ishlaydi; holat (massivlar) sahifa yangilanguncha saqlanadi.
 * Javob: { status, body, headers? } — headers javobga qo'shiladi (masalan Retry-After, ETag).
 */
function serverScript(code: string) {
  // "export function handle" ham ishlasin — oddiy skriptda export bo'lmaydi
  code = code.replace(/^(\s*)export\s+(default\s+)?(?=(async\s+)?function|const|let|var|class)/gm, "$1");
  return `<script>
(function () {
  var module = { exports: {} }, exports = module.exports;
  var handler = null;
  try {
    handler = (function (module, exports) {
${esc(code)}
;return typeof handle === "function" ? handle : (module.exports && module.exports.handle) || exports.handle || null;
    })(module, exports);
  } catch (e) { console.error("server.js: " + (e && e.message ? e.message : e)); }
  if (!handler) console.warn("server.js: handle(request) funksiyasi topilmadi");
  var realFetch = window.fetch.bind(window);
  window.fetch = async function (input, init) {
    init = init || {};
    var raw = typeof input === "string" ? input : input && input.url ? input.url : String(input);
    var url = new URL(raw, "http://devready.local");
    if (url.host !== "devready.local" || url.pathname.indexOf("/api") !== 0) return realFetch(input, init);
    var method = String(init.method || (input && input.method) || "GET").toUpperCase();
    var headers = {};
    new Headers(init.headers || {}).forEach(function (v, k) { headers[k] = v; });
    var body = init.body;
    if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) {} }
    var query = {};
    url.searchParams.forEach(function (v, k) { query[k] = v; });
    var req = { method: method, path: url.pathname, query: query, headers: headers, body: body === undefined ? null : body };
    // AbortController: haqiqiy fetch kabi — bekor qilinsa AbortError bilan rad etiladi (server ishi davom etadi)
    var signal = init.signal || (input && input.signal) || null;
    var aborted = function () { return new DOMException("The operation was aborted.", "AbortError"); };
    if (signal && signal.aborted) throw aborted();
    var work = (async function () {
      try {
        if (!handler) throw new Error("handle(request) topilmadi");
        var r = await handler(req);
        if (!r || typeof r.status !== "number") throw new Error("handle() { status, body } qaytarishi kerak");
        return r;
      } catch (e) {
        console.error("server.js: " + (e && e.message ? e.message : e));
        return { status: 500, body: { error: "server_error" } };
      }
    })();
    var res = signal
      ? await new Promise(function (resolve, reject) {
          var onAbort = function () { reject(aborted()); };
          signal.addEventListener("abort", onAbort, { once: true });
          work.then(function (v) { signal.removeEventListener("abort", onAbort); resolve(v); });
        })
      : await work;
    console.info("→ " + method + " " + url.pathname + url.search + "  " + res.status);
    var noBody = res.status === 204 || res.body === undefined || res.body === null;
    var outHeaders = { "content-type": "application/json" };
    if (res.headers && typeof res.headers === "object") Object.keys(res.headers).forEach(function (k) { outHeaders[k] = String(res.headers[k]); });
    return new Response(noBody ? null : JSON.stringify(res.body), { status: res.status, headers: outHeaders });
  };
})();
//# sourceURL=server.js
</script>`;
}

/** Talaba fayllaridan to'liq HTML hujjat */
export function buildDocument(files: SandboxFiles) {
  const server = files.server?.trim() ? serverScript(files.server) : "";
  const head = `<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><script>${BRIDGE}</script>${server}<style>${files.css}</style>`;
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
