import { useEffect, useState } from "react";
import { HiOutlineDocumentText, HiOutlineEye, HiOutlinePhoto, HiOutlinePlus } from "react-icons/hi2";
import { blogApi, errorMessage } from "../../api/api";
import { useCachedQuery } from "../../hooks/useCachedQuery";
import { Badge, Button, Card, ConfirmModal, EmptyState, ErrorState, Field, Input, Modal, PageHeader, PageLoader, Textarea, Toggle } from "../../components/ui";
import { useToast } from "../../components/ui/toast";
import { formatDate, mediaUrl } from "../../lib/format";
import type { Blogs } from "../../types/type";
import { stripMarkdown } from "../../components/Markdown";
import SafeImg from "../../components/SafeImg";

type Form = { title: string; slug: string; excerpt: string; text: string; tags: string; published: boolean; image: File | null; currentImage: string; removeImage: boolean };
const EMPTY: Form = { title: "", slug: "", excerpt: "", text: "", tags: "", published: true, image: null, currentImage: "", removeImage: false };

export default function SuperadminBlogs() {
  const toast = useToast();
  const query = useCachedQuery<Blogs[]>("admin:blogs", blogApi.all, { staleTime: 15_000 });
  const [editing, setEditing] = useState<Blogs | "new" | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [preview, setPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Blogs | null>(null);

  useEffect(() => {
    if (!form.image) return setPreview("");
    const url = URL.createObjectURL(form.image);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [form.image]);

  const openEdit = (b: Blogs) => {
    setForm({ title: b.title, slug: b.slug || "", excerpt: b.excerpt || "", text: b.text, tags: b.tags.join(", "), published: b.published, image: null, currentImage: b.image, removeImage: false });
    setEditing(b);
  };

  const save = async () => {
    if (!form.title.trim() || !form.text.trim()) return toast.error("Sarlavha va matn majburiy");
    const payload = {
      title: form.title.trim(),
      slug: form.slug.trim(),
      excerpt: form.excerpt.trim(),
      text: form.text,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      published: form.published,
      image: form.image,
      removeImage: form.removeImage,
    };
    setSaving(true);
    try {
      if (editing === "new") await blogApi.create(payload);
      else if (editing) await blogApi.update(editing._id, payload);
      toast.success("Post saqlandi");
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
      await blogApi.remove(deleting._id);
      query.mutate((prev) => (prev || []).filter((b) => b._id !== deleting._id));
      toast.success("Post o'chirildi");
      setDeleting(null);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const imageSrc = preview || (!form.removeImage && form.currentImage ? mediaUrl(form.currentImage) : "");

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Postlar"
        subtitle="Blog sahifasida chiqadigan maqolalar"
        actions={
          <Button
            onClick={() => {
              setForm(EMPTY);
              setEditing("new");
            }}
          >
            <HiOutlinePlus /> Post qo'shish
          </Button>
        }
      />
      {query.loading ? (
        <PageLoader />
      ) : query.error ? (
        <ErrorState message={query.error} onRetry={query.refetch} />
      ) : !query.data?.length ? (
        <Card>
          <EmptyState icon={<HiOutlineDocumentText />} title="Postlar yo'q" />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {query.data.map((b) => (
            <Card key={b._id} className="overflow-hidden flex flex-col">
              <SafeImg
                src={b.image ? mediaUrl(b.image) : ""}
                alt=""
                className="h-40 w-full object-cover"
                fallback={
                  <div className="h-40 bg-mist flex flex-col items-center justify-center gap-1 text-muted">
                    <HiOutlinePhoto size={32} />
                    {b.image && <span className="text-xs">Rasm topilmadi — qayta yuklang</span>}
                  </div>
                }
              />
              <div className="p-4 flex flex-col gap-2 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {b.published ? <Badge tone="success">E'lon qilingan</Badge> : <Badge>Qoralama</Badge>}
                  <span className="text-[11px] text-muted inline-flex items-center gap-1">
                    <HiOutlineEye /> {b.views || 0}
                  </span>
                  <span className="text-[11px] text-muted">{formatDate(b.createdAt)}</span>
                </div>
                <p className="text-sm font-bold text-ink line-clamp-2">{b.title}</p>
                <p className="text-xs text-muted line-clamp-2">{stripMarkdown(b.text)}</p>
                <div className="flex gap-2 mt-auto pt-2">
                  <Button size="sm" variant="secondary" onClick={() => openEdit(b)}>
                    Tahrirlash
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => setDeleting(b)}>
                    O'chirish
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        size="lg"
        title={editing === "new" ? "Yangi post" : "Postni tahrirlash"}
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
          <Field label="Sarlavha">
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={200} />
          </Field>
          <Field label="Qisqa tavsif (SEO)" hint={`Google natijasi va Telegram preview'da chiqadi. 120–160 belgi ideal, hozir: ${form.excerpt.trim().length}. Bo'sh qolsa — matn boshidan olinadi`}>
            <Textarea rows={2} value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} maxLength={300} />
          </Field>
          <Field label="Manzil (slug)" hint="devready.uz/blogs/… — bo'sh qolsa sarlavhadan avtomatik yasaladi. E'lon qilingandan keyin o'zgartirmang: eski havolalar ishlamay qoladi">
            <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="masalan: texnik-suhbatga-tayyorgarlik" maxLength={90} />
          </Field>
          <Field label="Matn" hint="## sarlavha, - ro'yxat, **qalin**, `kod`, ``` kod bloki, > iqtibos">
            <Textarea rows={10} value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} />
          </Field>
          <Field label="Teglar" hint="Vergul bilan: Frontend, AI, Karyera">
            <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
          </Field>
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-ink-2">Rasm</span>
            {imageSrc && <img src={imageSrc} alt="" className="h-40 w-full object-cover rounded-xl" />}
            <div className="flex gap-2">
              <label className="px-3 py-2 rounded-xl border border-line text-sm text-ink-2 hover:bg-mist cursor-pointer">
                Rasm tanlash
                <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => setForm({ ...form, image: e.target.files?.[0] || null, removeImage: false })} />
              </label>
              {imageSrc && (
                <Button variant="ghost" onClick={() => setForm({ ...form, image: null, removeImage: true })}>
                  Rasmni olib tashlash
                </Button>
              )}
            </div>
          </div>
          <Toggle checked={form.published} onChange={(v) => setForm({ ...form, published: v })} label={form.published ? "E'lon qilingan" : "Qoralama"} />
        </div>
      </Modal>

      <ConfirmModal
        open={!!deleting}
        danger
        title="Postni o'chirish"
        text={<b>{deleting?.title}</b>}
        confirmLabel="O'chirish"
        onConfirm={remove}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
