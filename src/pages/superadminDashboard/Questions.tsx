import { useState } from "react";
import { HiOutlinePlus, HiOutlineTrash } from "react-icons/hi2";
import { errorMessage, quizApi } from "../../api/api";
import { useCachedQuery } from "../../hooks/useCachedQuery";
import { Badge, Button, Card, ConfirmModal, EmptyState, ErrorState, Field, Input, Modal, PageHeader, PageLoader, Select, cx } from "../../components/ui";
import { useToast } from "../../components/ui/toast";
import { TRACKS } from "../../lib/constants";
import type { Question } from "../../types/type";

type Form = Omit<Question, "_id">;
const EMPTY: Form = { direction: "Frontend", q: "", options: ["", "", ""], correct: 0 };

/** Ro'yxatdan o'tishdagi daraja aniqlash testi savollari */
export default function SuperadminQuestions() {
  const toast = useToast();
  const [direction, setDirection] = useState("");
  const query = useCachedQuery(`admin:questions:${direction}`, () => quizApi.list(direction || undefined), { staleTime: 15_000 });
  const [editing, setEditing] = useState<Question | "new" | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Question | null>(null);

  const save = async () => {
    const options = form.options.map((o) => o.trim());
    if (!form.q.trim() || options.some((o) => !o)) return toast.error("Savol va barcha variantlarni to'ldiring");
    setSaving(true);
    try {
      const payload = { ...form, q: form.q.trim(), options };
      if (editing === "new") await quizApi.create(payload);
      else if (editing) await quizApi.update(editing._id, payload);
      toast.success("Savol saqlandi");
      setEditing(null);
      query.refetch();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!deleting) return;
    try {
      await quizApi.remove(deleting._id);
      setDeleting(null);
      query.refetch();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Test savollari"
        subtitle="Ro'yxatdan o'tishda yo'nalish bo'yicha 5 ta tasodifiy savol beriladi va boshlang'ich daraja aniqlanadi"
        actions={
          <>
            <Select value={direction} onChange={(e) => setDirection(e.target.value)} className="w-44">
              <option value="">Barcha yo'nalishlar</option>
              {TRACKS.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
            <Button
              onClick={() => {
                setForm({ ...EMPTY, direction: direction || "Frontend" });
                setEditing("new");
              }}
            >
              <HiOutlinePlus /> Savol
            </Button>
          </>
        }
      />
      <Card>
        {query.loading ? (
          <PageLoader />
        ) : query.error ? (
          <ErrorState message={query.error} onRetry={query.refetch} />
        ) : !query.data?.length ? (
          <EmptyState title="Savollar yo'q" text="Savol bo'lmagan yo'nalishda talaba testsiz 'Beginner' daraja bilan boshlaydi" />
        ) : (
          <div className="divide-y divide-line">
            {query.data.map((q) => (
              <div key={q._id} className="px-5 py-4 flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge>{q.direction}</Badge>
                  </div>
                  <p className="text-sm font-semibold text-ink">{q.q}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {q.options.map((o, i) => (
                      <span key={i} className={cx("text-xs px-2 py-0.5 rounded-md border", i === q.correct ? "border-brand/30 text-brand" : "border-line text-muted")}>
                        {o}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setForm({ direction: q.direction, q: q.q, options: q.options, correct: q.correct });
                      setEditing(q);
                    }}
                  >
                    Tahrirlash
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => setDeleting(q)}>
                    <HiOutlineTrash />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "Yangi savol" : "Savolni tahrirlash"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Bekor qilish
            </Button>
            <Button loading={saving} onClick={save}>
              Saqlash
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label="Yo'nalish">
            <Select value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value })}>
              {TRACKS.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </Field>
          <Field label="Savol">
            <Input value={form.q} onChange={(e) => setForm({ ...form, q: e.target.value })} />
          </Field>
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-ink-2">Variantlar (to'g'risini belgilang)</span>
            {form.options.map((o, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="radio" name="correct" checked={form.correct === i} onChange={() => setForm({ ...form, correct: i })} className="accent-brand w-4 h-4" />
                <Input value={o} onChange={(e) => setForm({ ...form, options: form.options.map((x, j) => (j === i ? e.target.value : x)) })} placeholder={`${i + 1}-variant`} />
                {form.options.length > 2 && (
                  <Button
                    variant="ghost"
                    onClick={() =>
                      setForm({
                        ...form,
                        options: form.options.filter((_, j) => j !== i),
                        correct: form.correct === i ? 0 : form.correct > i ? form.correct - 1 : form.correct,
                      })
                    }
                  >
                    <HiOutlineTrash />
                  </Button>
                )}
              </div>
            ))}
            {form.options.length < 6 && (
              <Button variant="outline" size="sm" className="self-start" onClick={() => setForm({ ...form, options: [...form.options, ""] })}>
                <HiOutlinePlus /> Variant
              </Button>
            )}
          </div>
        </div>
      </Modal>
      <ConfirmModal open={!!deleting} danger title="Savolni o'chirish" text={deleting?.q} confirmLabel="O'chirish" onConfirm={remove} onClose={() => setDeleting(null)} />
    </div>
  );
}
