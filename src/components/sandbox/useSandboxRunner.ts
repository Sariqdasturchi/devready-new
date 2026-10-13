import { useCallback, useEffect, useRef, useState } from "react";
import { MSG, buildDocument, type ConsoleLine, type SandboxFiles, type SandboxTest, type TestResult } from "./runtime";

/**
 * Kodni izolyatsiyalangan iframe ichida ishga tushirish: jonli natija, konsol va avtomatik testlar.
 * `live` yoqilgan bo'lsa fayllar o'zgargach 0.6 s da natija yangilanadi.
 */
export function useSandboxRunner(files: SandboxFiles, tests: SandboxTest[], { live = true }: { live?: boolean } = {}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const pendingTests = useRef(false);
  const [doc, setDoc] = useState(() => buildDocument(files));
  const [frameKey, setFrameKey] = useState(0);
  const [logs, setLogs] = useState<ConsoleLine[]>([]);
  const [results, setResults] = useState<TestResult[] | null>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!live) return;
    const t = setTimeout(() => {
      setDoc(buildDocument(files));
      setLogs([]);
    }, 600);
    return () => clearTimeout(t);
  }, [files, live]);

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.source !== frame.current?.contentWindow || !e.data || e.data.source !== MSG) return;
      if (e.data.type === "console") setLogs((l) => [...l.slice(-199), { level: e.data.level, text: e.data.text }]);
      if (e.data.type === "ready" && pendingTests.current) {
        pendingTests.current = false;
        frame.current?.contentWindow?.postMessage({ source: `${MSG}-host`, type: "run-tests", tests }, "*");
      }
      if (e.data.type === "test-results") {
        setResults(e.data.results);
        setRunning(false);
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [tests]);

  // Iframe javob bermasa (masalan, cheksiz sikl) — 8 soniyadan keyin to'xtatamiz
  useEffect(() => {
    if (!running) return;
    const t = setTimeout(() => {
      pendingTests.current = false;
      setRunning(false);
      setResults(tests.map((x) => ({ title: x.title, ok: false, error: "Kod javob bermadi — cheksiz sikl yoki xatolik bo'lishi mumkin" })));
    }, 8000);
    return () => clearTimeout(t);
  }, [running, tests]);

  /** Sahifani toza holatda qayta yuklab, testlarni ishga tushiradi */
  const runTests = useCallback(() => {
    if (!tests.length) return;
    setRunning(true);
    pendingTests.current = true;
    setLogs([]);
    setDoc(buildDocument(files));
    setFrameKey((k) => k + 1);
  }, [files, tests]);

  const reload = useCallback(() => {
    setLogs([]);
    setDoc(buildDocument(files));
    setFrameKey((k) => k + 1);
  }, [files]);

  const passed = results?.filter((r) => r.ok).length ?? 0;
  return { frame, doc, frameKey, logs, results, setResults, running, runTests, reload, passed };
}
