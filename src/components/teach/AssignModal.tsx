import { useMemo, useState } from "react";
import { HiOutlineCheckCircle, HiOutlineMagnifyingGlass } from "react-icons/hi2";
import { errorMessage, orgApi } from "../../api/api";
import { useCachedQuery } from "../../hooks/useCachedQuery";
import { ACTIVE_TRACKS, DIFFICULTY } from "../../lib/constants";
import { formatDuration } from "../../lib/format";
import type { ReviewMode } from "../../types/type";
import { Alert, Button, Field, Input, Modal, PageLoader, Select, Textarea, cx } from "../ui";
import { useToast } from "../ui/toast";
import { REVIEW_MODE, defaultDue, fromLocalInput } from "./cells";

const STACK: Record<string, string> = { web: "HTML · CSS · JS", code: "JS · TS · Python", sql: "PostgreSQL", config: "DevOps", qa: "Test yozish" };

/** Guruhga katalogdagi taskni muddat bilan berish */
export default function AssignModal({
  open,
  onClose,
  groupId,
  assignedTaskIds,
  onAssigned,
}: {
  open: boolean;
  onClose: () => void;
  groupId: string;
  assignedTaskIds: string[];
  onAssigned: () => void;
}) {
  const toast = useToast();
  const catalog = useCachedQuery("org:catalog", () => orgApi.catalog(), { staleTime: 5 * 60_000, enabled: open });
  const [track, setTrack] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [search, setSearch] = useState("");
  const [taskId, setTaskId] = useState("");
  const [due, setDue] = useState(defaultDue(7));
  const [mode, setMode] = useState<ReviewMode>("ai");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const taken = useMemo(() => new Set(assignedTaskIds), [assignedTaskIds]);
  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (catalog.data || []).filter((t) => (!track || t.track === track) && (!difficulty || t.difficulty === difficulty) && (!q || t.title.toLowerCase().includes(q)));
  }, [catalog.data, track, difficulty, search]);
  const picked = catalog.data?.find((t) => t.id === taskId);

  const submit = async () => {
    if (!taskId) return toast.error("Taskni tanlang");
    if (!due) return toast.error("Muddatni kiriting");
    setSaving(true);
    try {
      const r = await orgApi.assign(groupId, { taskId, dueAt: fromLocalInput(due), reviewMode: mode, note: note.trim() || undefined });
      toast.success(r.message);
      setTaskId("");
      setNote("");
      onAssigned();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title="Topshiriq berish"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button onClick={submit} loading={saving} disabled={!taskId}>
            Guruhga berish
          </Button>
        </>
      }
    >
      <div className="grid lg:grid-cols-[1.35fr_1fr] gap-6">
        <div className="flex flex-col gap-3 min-w-0">
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Task nomi..." className="pl-9" aria-label="Qidirish" />
            </div>
            <Select value={track} onChange={(e) => setTrack(e.target.value)} className="w-36" aria-label="Yo'nalish">
              <option value="">Yo'nalish</option>
              {ACTIVE_TRACKS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
            <Select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="w-32" aria-label="Qiyinlik">
              <option value="">Qiyinlik</option>
              {Object.entries(DIFFICULTY).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="rounded-xl border border-line overflow-y-auto h-[46vh] min-h-[260px]" role="listbox" aria-label="Tasklar">
            {catalog.loading ? (
              <PageLoader label="Tasklar..." />
            ) : catalog.error ? (
              <div className="p-4">
                <Alert tone="danger">{catalog.error}</Alert>
              </div>
            ) : !list.length ? (
              <p className="p-6 text-center text-sm text-muted">Bu filtr bo'yicha task yo'q</p>
            ) : (
              list.map((t) => {
                const already = taken.has(t.id);
                const active = t.id === taskId;
                const diff = DIFFICULTY[t.difficulty];
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="option"
                    aria-selected={active}
                    disabled={already}
                    onClick={() => setTaskId(t.id)}
                    className={cx(
                      "w-full text-left px-4 py-3 border-b border-line last:border-b-0 flex gap-3 items-start",
                      already ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-mist",
                      active && "bg-brand-tint hover:bg-brand-tint",
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-semibold text-ink leading-snug">{t.title}</span>
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-[12px] text-muted">
                        <span>{t.track}</span>
                        <span className={cx("px-1.5 rounded border text-[11px] font-semibold", diff.className)}>{diff.label}</span>
                        <span>{STACK[t.kind] || "Repozitoriy"}</span>
                        <span>{formatDuration(t.estimatedTime)}</span>
                        <span>{t.xp} XP</span>
                        {already && <span className="text-ink-2 font-semibold">Guruhga berilgan</span>}
                      </span>
                    </span>
                    {active && <HiOutlineCheckCircle className="text-brand shrink-0 mt-0.5" size={20} />}
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-xl bg-mist border border-line p-4 min-h-[86px]">
            {picked ? (
              <>
                <p className="text-[14px] font-semibold text-ink">{picked.title}</p>
                <p className="text-[13px] text-ink-2 mt-1 line-clamp-4">{picked.description}</p>
              </>
            ) : (
              <p className="text-[13px] text-muted">Chapdagi ro'yxatdan task tanlang. Har bir taskda brauzerda ishlaydigan avtomatik testlar bor.</p>
            )}
          </div>
          <Field label="Topshirish muddati (Toshkent vaqti)" hint="Muddat o'tgach talaba boshlay olmaydi. Keyin uzaytirish mumkin.">
            <Input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} aria-label="Muddat" />
          </Field>
          <div className="flex flex-col gap-2" role="radiogroup" aria-label="Tekshiruv">
            <span className="text-[13px] font-semibold text-ink-2">Kim baholaydi?</span>
            {(["ai", "teacher"] as const).map((m) => (
              <label key={m} className={cx("flex gap-3 p-3 rounded-xl border cursor-pointer", mode === m ? "border-brand bg-brand-tint" : "border-line hover:border-ink-2")}>
                <input type="radio" name="review-mode" checked={mode === m} onChange={() => setMode(m)} className="mt-1 accent-[var(--color-brand)]" />
                <span>
                  <span className="block text-sm font-semibold text-ink">{REVIEW_MODE[m].label}</span>
                  <span className="block text-xs text-muted mt-0.5">{REVIEW_MODE[m].hint}</span>
                </span>
              </label>
            ))}
          </div>
          <Field label="Talabalarga izoh (ixtiyoriy)">
            <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} placeholder="Masalan: avval 3-mavzuni takrorlang, indekslarga e'tibor bering" />
          </Field>
        </div>
      </div>
    </Modal>
  );
}
