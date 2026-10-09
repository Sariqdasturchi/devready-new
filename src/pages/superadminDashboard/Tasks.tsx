import { useState } from "react";
import { HiOutlinePlus, HiOutlineTrash } from "react-icons/hi2";
import { errorMessage, taskApi } from "../../api/api";
import { useCachedQuery, invalidateCache } from "../../hooks/useCachedQuery";
import { Button, Card, ConfirmModal, ErrorState, Field, Input, Modal, PageHeader, PageLoader, Select, Textarea, Toggle } from "../../components/ui";
import { useToast } from "../../components/ui/toast";
import { TaskTile, TaskViewModal, TasksEmpty, useTaskFilters } from "../../components/TaskBrowser";
import { DIFFICULTY, TRACKS } from "../../lib/constants";
import { formatDuration } from "../../lib/format";
import type { DesignTemplate, Difficulty, Task } from "../../types/type";

type Form = {
  title: string;
  track: string;
  difficulty: Difficulty;
  estimatedTime: number;
  xp: number;
  description: string;
  content: string;
  requirements: string[];
  designTemplates: DesignTemplate[];
  exampleLink: string;
  isActive: boolean;
};

const EMPTY: Form = {
  title: "",
  track: "Frontend",
  difficulty: "oson",
  estimatedTime: DIFFICULTY.oson.minutes,
  xp: 100,
  description: "",
  content: "",
  requirements: [""],
  designTemplates: [],
  exampleLink: "",
  isActive: true,
};

const TIME_PRESETS = [60, 120, 240, 360, 720, 1440, 2880, 4320];
const isUrl = (u: string) => /^https?:\/\/\S+$/.test(u.trim());

export default function SuperadminTasks() {
  const toast = useToast();
  const query = useCachedQuery<Task[]>("admin:tasks", () => taskApi.all(), { staleTime: 15_000 });
  const { visible, filters } = useTaskFilters(query.data || []);
  const [editing, setEditing] = useState<Task | "new" | null>(null);
  const [viewing, setViewing] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState<Task | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  const openNew = () => {
    setForm(EMPTY);
    setEditing("new");
  };
  const openEdit = (t: Task) => {
    setForm({
      title: t.title,
      track: t.track,
      difficulty: t.difficulty,
      estimatedTime: t.estimatedTime,
      xp: t.xp,
      description: t.description,
      content: t.content || "",
      requirements: t.requirements?.length ? t.requirements : [""],
      designTemplates: t.designTemplates || [],
      exampleLink: t.exampleLink || "",
      isActive: t.isActive,
    });
    setEditing(t);
  };

  const save = async () => {
    if (form.title.trim().length < 3) return toast.error("Sarlavha kiriting");
    if (!form.description.trim()) return toast.error("Tavsif kiriting");
    if (form.estimatedTime < 5) return toast.error("Vaqt kamida 5 daqiqa");
    if (form.exampleLink && !isUrl(form.exampleLink)) return toast.error("Namuna havolasi noto'g'ri");
    const templates = form.designTemplates.filter((t) => t.url.trim());
    if (templates.some((t) => !isUrl(t.url))) return toast.error("Shablon havolalari https:// bilan boshlanishi kerak");
    const payload: Partial<Task> = {
      ...form,
      title: form.title.trim(),
      requirements: form.requirements.map((r) => r.trim()).filter(Boolean),
      designTemplates: templates.map((t) => ({ title: t.title.trim() || "Shablon", url: t.url.trim() })),
      exampleLink: form.exampleLink.trim() || null,
    };
    setSaving(true);
    try {
      if (editing === "new") {
        const t = await taskApi.create(payload);
        query.mutate((prev) => [{ ...t, submissionsCount: 0, approvedCount: 0 }, ...(prev || [])]);
        toast.success("Task yaratildi");
      } else if (editing) {
        const t = await taskApi.update(editing._id, payload);
        query.mutate((prev) => (prev || []).map((x) => (x._id === t._id ? { ...x, ...t } : x)));
        toast.success("Task yangilandi");
      }
      invalidateCache("admin:stats", "mentor:tasks");
      setEditing(null);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (t: Task) => {
    try {
      const u = await taskApi.update(t._id, { isActive: !t.isActive });
      query.mutate((prev) => (prev || []).map((x) => (x._id === u._id ? { ...x, ...u } : x)));
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const remove = async () => {
    if (!deleting) return;
    try {
      await taskApi.remove(deleting._id);
      query.mutate((prev) => (prev || []).filter((x) => x._id !== deleting._id));
      toast.success("Task o'chirildi");
      setDeleting(null);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Tasklar"
        subtitle={`${query.data?.length || 0} ta task`}
        actions={
          <Button onClick={openNew}>
            <HiOutlinePlus /> Task qo'shish
          </Button>
        }
      />
      {filters}
      {query.loading ? (
        <PageLoader />
      ) : query.error ? (
        <ErrorState message={query.error} onRetry={query.refetch} />
      ) : visible.length === 0 ? (
        <Card>
          <TasksEmpty />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {visible.map((t) => (
            <TaskTile
              key={t._id}
              task={t}
              onClick={() => setViewing(t)}
              footer={
                <div className="flex gap-1.5 pt-3 border-t border-line">
                  <Button size="sm" variant="secondary" onClick={() => openEdit(t)}>
                    Tahrirlash
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => toggleActive(t)}>
                    {t.isActive ? "Nofaol qilish" : "Faollashtirish"}
                  </Button>
                  <Button size="sm" variant="danger" className="ml-auto" onClick={() => setDeleting(t)}>
                    <HiOutlineTrash />
                  </Button>
                </div>
              }
            />
          ))}
        </div>
      )}

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        size="lg"
        title={editing === "new" ? "Yangi task" : "Taskni tahrirlash"}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Sarlavha *" className="sm:col-span-2">
            <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Masalan: Responsive landing page" />
          </Field>
          <Field label="Yo'nalish">
            <Select value={form.track} onChange={(e) => set("track", e.target.value)}>
              {TRACKS.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </Field>
          <Field label="Qiyinlik">
            <Select
              value={form.difficulty}
              onChange={(e) => {
                const d = e.target.value as Difficulty;
                setForm((f) => ({ ...f, difficulty: d, estimatedTime: editing === "new" ? DIFFICULTY[d].minutes : f.estimatedTime }));
              }}
            >
              {Object.entries(DIFFICULTY).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={`Ajratilgan vaqt: ${formatDuration(form.estimatedTime)}`} hint="Daqiqada. Vaqt tugasa task avtomatik 'bajarilmagan' bo'ladi">
            <Input type="number" min={5} max={10080} value={form.estimatedTime} onChange={(e) => set("estimatedTime", Number(e.target.value))} />
          </Field>
          <Field label="XP (maksimal ball)">
            <Input type="number" min={0} value={form.xp} onChange={(e) => set("xp", Number(e.target.value))} />
          </Field>
          <div className="sm:col-span-2 flex flex-wrap gap-1.5 -mt-2">
            {TIME_PRESETS.map((m) => (
              <button key={m} type="button" onClick={() => set("estimatedTime", m)} className="px-2 py-1 rounded-lg text-[11px] border border-line text-ink-2 hover:border-brand cursor-pointer">
                {formatDuration(m)}
              </button>
            ))}
          </div>
          <Field label="Qisqa tavsif *" className="sm:col-span-2">
            <Textarea rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} />
          </Field>
          <Field label="Batafsil shartlar" hint="Texnik topshiriq, qadamlar, baholash mezonlari" className="sm:col-span-2">
            <Textarea rows={6} value={form.content} onChange={(e) => set("content", e.target.value)} />
          </Field>

          <div className="sm:col-span-2 flex flex-col gap-2">
            <span className="text-xs font-semibold text-ink-2">Talablar</span>
            {form.requirements.map((r, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  value={r}
                  onChange={(e) => set("requirements", form.requirements.map((x, j) => (j === i ? e.target.value : x)))}
                  placeholder={`${i + 1}-talab`}
                />
                <Button variant="ghost" onClick={() => set("requirements", form.requirements.filter((_, j) => j !== i))} aria-label="O'chirish">
                  <HiOutlineTrash />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" className="self-start" onClick={() => set("requirements", [...form.requirements, ""])}>
              <HiOutlinePlus /> Talab qo'shish
            </Button>
          </div>

          <div className="sm:col-span-2 flex flex-col gap-2">
            <span className="text-xs font-semibold text-ink-2">Shablonlar (Figma, maket, fayllar)</span>
            {form.designTemplates.map((t, i) => (
              <div key={i} className="grid grid-cols-[1fr_2fr_auto] gap-2">
                <Input
                  value={t.title}
                  onChange={(e) => set("designTemplates", form.designTemplates.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))}
                  placeholder="Nomi"
                />
                <Input
                  value={t.url}
                  onChange={(e) => set("designTemplates", form.designTemplates.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))}
                  placeholder="https://www.figma.com/file/..."
                />
                <Button variant="ghost" onClick={() => set("designTemplates", form.designTemplates.filter((_, j) => j !== i))} aria-label="O'chirish">
                  <HiOutlineTrash />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" className="self-start" onClick={() => set("designTemplates", [...form.designTemplates, { title: "Figma maket", url: "" }])}>
              <HiOutlinePlus /> Shablon qo'shish
            </Button>
          </div>

          <Field label="Namuna havolasi (ixtiyoriy)" className="sm:col-span-2">
            <Input value={form.exampleLink} onChange={(e) => set("exampleLink", e.target.value)} placeholder="https://..." />
          </Field>
          <div className="sm:col-span-2">
            <Toggle checked={form.isActive} onChange={(v) => set("isActive", v)} label={form.isActive ? "Faol — talabalarga ko'rinadi" : "Nofaol — yashirilgan"} />
          </div>
        </div>
      </Modal>

      <TaskViewModal task={viewing} onClose={() => setViewing(null)} />
      <ConfirmModal
        open={!!deleting}
        danger
        title="Taskni o'chirish"
        text={
          <>
            <b>{deleting?.title}</b> o'chiriladi. Talabalarning eski natijalari saqlanib qoladi. Vaqtincha yashirish uchun "Nofaol qilish"dan foydalaning.
          </>
        }
        confirmLabel="O'chirish"
        onConfirm={remove}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
