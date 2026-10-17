import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { submissionApi } from "../../api/api";
import type { SandboxCode, UserTask } from "../../types/type";
import { invalidateCache } from "../../hooks/useCachedQuery";
import { useToast } from "../ui/toast";
import { normalizeCode, sameCode, starterCode } from "./kinds";

/* ───────── Qoralama: shu qurilma (localStorage) + server ───────── */

const storeKey = (id: string) => `devready-sandbox:${id}`;

function readLocal(id: string): { code: SandboxCode; at: number } | null {
  try {
    const raw = localStorage.getItem(storeKey(id));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Eski format: { files: {html,css,js}, at }
    const code = parsed?.code || parsed?.files || parsed;
    return code && typeof code === "object" ? { code, at: Number(parsed.at) || 0 } : null;
  } catch {
    return null;
  }
}
function writeLocal(id: string, code: SandboxCode) {
  try {
    localStorage.setItem(storeKey(id), JSON.stringify({ code, at: Date.now() }));
    return true;
  } catch {
    return false;
  }
}
export function clearLocal(id: string) {
  try {
    localStorage.removeItem(storeKey(id));
  } catch {
    /* e'tiborsiz */
  }
}

/** Boshlang'ich yechim: shu qurilmadagi yoki serverdagi qoralamaning yangirog'i, bo'lmasa task shabloni */
export function initialCode(t: UserTask): SandboxCode {
  const sb = t.sandbox;
  const starter = starterCode(sb);
  const server = normalizeCode(sb, t.submission?.code);
  if (t.status !== "in_progress") return server || starter;
  const local = t.submissionId ? normalizeCode(sb, readLocal(t.submissionId)?.code) : null;
  const localAt = t.submissionId ? readLocal(t.submissionId)?.at || 0 : 0;
  const serverAt = t.submission?.updatedAt ? new Date(t.submission.updatedAt).getTime() : 0;
  if (local && (!server || localAt >= serverAt)) return local;
  return server || starter;
}

export type SaveState = "idle" | "saving" | "saved" | "local";

/** Kod o'zgarganda: darhol shu qurilmaga, 4 soniya tinch turgandan keyin serverga saqlaydi */
export function useDraft(task: UserTask, code: SandboxCode) {
  const editable = task.status === "in_progress" && !!task.submissionId;
  const subId = task.submissionId || "";
  const [save, setSave] = useState<SaveState>("idle");
  const serverCopy = useRef<SandboxCode | null>(normalizeCode(task.sandbox, task.submission?.code));

  useEffect(() => {
    if (!editable || sameCode(code, serverCopy.current)) return;
    const local = setTimeout(() => writeLocal(subId, code), 500);
    const remote = setTimeout(() => {
      setSave("saving");
      submissionApi
        .saveDraft(subId, code)
        .then(() => {
          serverCopy.current = code;
          setSave("saved");
        })
        .catch(() => setSave(writeLocal(subId, code) ? "local" : "idle"));
    }, 4000);
    return () => {
      clearTimeout(local);
      clearTimeout(remote);
    };
  }, [code, editable, subId]);

  const label = !editable
    ? "Faqat ko'rish"
    : { idle: "Qoralama avtomatik saqlanadi", saving: "Saqlanmoqda...", saved: "Saqlandi", local: "Faqat shu qurilmada saqlandi" }[save];
  return { editable, subId, save, label };
}

/** Vaqt tugashi va yuborishdan keyingi yo'naltirishlar */
export function useWorkspaceExit(task: UserTask) {
  const navigate = useNavigate();
  const toast = useToast();
  const id = task._id;
  const onExpired = useCallback(() => {
    toast.error("Ajratilgan vaqt tugadi. Task bajarilmaganlar ro'yxatiga o'tkazildi");
    invalidateCache("user:tasks", "user:overview", "user:submissions");
    navigate(`/dashboard/tasks/${id}`, { replace: true });
  }, [id, navigate, toast]);
  const onSubmitted = useCallback(() => {
    if (task.submissionId) clearLocal(task.submissionId);
    invalidateCache("user:tasks", "user:overview", "user:submissions");
    navigate(`/dashboard/tasks/${id}`, { replace: true });
  }, [id, navigate, task.submissionId]);
  return { onExpired, onSubmitted };
}

/** Ctrl/Cmd + Enter — tekshirish */
export function useRunShortcut(run: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        run();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [run]);
}

