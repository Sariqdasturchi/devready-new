import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { HiOutlineCamera } from "react-icons/hi2";
import { errorMessage, profileApi } from "../api/api";
import { updateStoredUser } from "../lib/auth";
import { ACTIVE_TRACKS } from "../lib/constants";
import { formatDate } from "../lib/format";
import { invalidateCache } from "../hooks/useCachedQuery";
import type { User } from "../types/type";
import { Avatar, Button, Card, ErrorState, Field, Input, PageHeader, PageLoader, Select, Textarea, Toggle } from "./ui";
import { useToast } from "./ui/toast";
import PublicProfileSettings from "./PublicProfileSettings";

/** Barcha rollar uchun profil sozlamalari */
export default function ProfileSettings() {
  const toast = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState("");
  const [fullName, setFullName] = useState("");
  const [direction, setDirection] = useState("");
  const [bio, setBio] = useState("");
  const [isAvailable, setIsAvailable] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = () =>
    profileApi
      .get()
      .then((u) => {
        setUser(u);
        setFullName(u.fullName);
        setDirection(u.direction || "");
        setBio(u.bio || "");
        setIsAvailable(u.isAvailable !== false);
        setError("");
      })
      .catch((err) => setError(errorMessage(err)));

  useEffect(() => {
    load();
  }, []);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!user) return <PageLoader />;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (fullName.trim().length < 3) return toast.error("Ism kamida 3 ta harf bo'lishi kerak");
    setSaving(true);
    try {
      const payload: Parameters<typeof profileApi.update>[0] = { fullName: fullName.trim() };
      if (user.role === "user" && direction && direction !== user.direction) payload.direction = direction;
      if (user.role === "mentor") {
        payload.bio = bio;
        payload.isAvailable = isAvailable;
      }
      const updated = await profileApi.update(payload);
      setUser(updated);
      updateStoredUser(updated);
      invalidateCache("user:tasks", "user:overview");
      toast.success("Profil saqlandi");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const upload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error("Rasm hajmi 5MB dan oshmasligi kerak");
    setUploading(true);
    try {
      const { avatar } = await profileApi.uploadAvatar(file);
      setUser({ ...user, avatar });
      updateStoredUser({ avatar });
      toast.success("Rasm yangilandi");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-3xl flex flex-col gap-5">
      <PageHeader title="Sozlamalar" subtitle="Profil ma'lumotlari" />

      <Card className="p-5 flex items-center gap-5">
        <div className="relative">
          <Avatar name={user.fullName} src={user.avatar} size={72} />
          <label className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-brand text-white flex items-center justify-center cursor-pointer hover:bg-brand-deep">
            {uploading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <HiOutlineCamera size={16} />}
            <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={upload} disabled={uploading} />
          </label>
        </div>
        <div className="min-w-0">
          <p className="text-lg font-bold text-ink truncate">{user.fullName}</p>
          <p className="text-xs text-muted">A'zo bo'lgan sana: {formatDate(user.createdAt)}</p>
        </div>
      </Card>

      <Card className="p-5">
        <form onSubmit={save} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Ism va familiya" className="sm:col-span-2">
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </Field>
          <Field label="Telefon raqam" hint="Kirish uchun ishlatiladi — o'zgartirish uchun administratorga murojaat qiling">
            <Input value={user.phone} disabled />
          </Field>
          <Field label="Telegram ID" hint="Tasdiqlash kodlari shu akkauntga keladi">
            <Input value={user.telegramId || "—"} disabled />
          </Field>
          {user.role === "user" && (
            <Field label="Yo'nalish" hint="O'zgartirilsa, tasklar yangi yo'nalish bo'yicha ko'rsatiladi" className="sm:col-span-2">
              <Select value={direction} onChange={(e) => setDirection(e.target.value)}>
                <option value="" disabled>
                  Tanlang
                </option>
                {ACTIVE_TRACKS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          {user.role === "mentor" && (
            <>
              <Field label="Yo'nalish" hint="Administrator tomonidan belgilanadi">
                <Input value={user.direction || "—"} disabled />
              </Field>
              <div className="flex items-end pb-2">
                <Toggle checked={isAvailable} onChange={setIsAvailable} label={isAvailable ? "Yangi tekshiruvlarni qabul qilaman" : "Hozir bandman"} />
              </div>
              <Field label="Qisqacha o'zingiz haqingizda" className="sm:col-span-2">
                <Textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={500} placeholder="Tajriba, texnologiyalar..." />
              </Field>
            </>
          )}
          <div className="sm:col-span-2 flex justify-end">
            <Button type="submit" loading={saving}>
              Saqlash
            </Button>
          </div>
        </form>
      </Card>

      {user.role === "user" && (
        <PublicProfileSettings
          user={user}
          onSaved={(u) => {
            setUser(u);
            setBio(u.bio || "");
          }}
        />
      )}
    </div>
  );
}
