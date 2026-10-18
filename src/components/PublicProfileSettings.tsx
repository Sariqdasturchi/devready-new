import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import { HiOutlineArrowTopRightOnSquare, HiOutlineEye, HiOutlineLink } from "react-icons/hi2";
import { errorMessage, profileApi } from "../api/api";
import { updateStoredUser } from "../lib/auth";
import { copyText } from "../lib/clipboard";
import type { User } from "../types/type";
import { Alert, Button, Card, Field, Input, Textarea, Toggle, cx } from "./ui";
import { useToast } from "./ui/toast";

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

/** Kabinet → Sozlamalar: ochiq profil (devready.uz/u/<username>) */
export default function PublicProfileSettings({ user, onSaved }: { user: User; onSaved: (u: User) => void }) {
  const toast = useToast();
  const { hash } = useLocation();
  const ref = useRef<HTMLDivElement>(null);
  const [isPublic, setIsPublic] = useState(!!user.profilePublic);
  const [showWork, setShowWork] = useState(!!user.profileShowWork);
  const [username, setUsername] = useState(user.username || "");
  const [bio, setBio] = useState(user.bio || "");
  const [github, setGithub] = useState(user.links?.github || "");
  const [linkedin, setLinkedin] = useState(user.links?.linkedin || "");
  const [telegram, setTelegram] = useState(user.links?.telegram ? `@${user.links.telegram}` : "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // /dashboard/settings#public-profile — ochiq profil sahifasidagi "Sozlamalar" havolasidan
  useEffect(() => {
    if (hash === "#public-profile") ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [hash]);

  const savedUsername = user.username || "";
  const link = `${window.location.origin}/u/${savedUsername}`;
  const dirty =
    isPublic !== !!user.profilePublic ||
    showWork !== !!user.profileShowWork ||
    username !== savedUsername ||
    bio !== (user.bio || "") ||
    github !== (user.links?.github || "") ||
    linkedin !== (user.links?.linkedin || "") ||
    telegram.replace(/^@/, "") !== (user.links?.telegram || "");

  const save = async (e?: FormEvent, patch?: { profilePublic?: boolean }) => {
    e?.preventDefault();
    const u = username.trim().toLowerCase().replace(/^@/, "");
    if (!USERNAME_RE.test(u)) {
      setErrors({ username: "3–20 belgi: faqat lotin harflari, raqam va _" });
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      const updated = await profileApi.update({
        username: u,
        profilePublic: patch?.profilePublic ?? isPublic,
        profileShowWork: showWork,
        bio,
        links: { github: github.trim(), linkedin: linkedin.trim(), telegram: telegram.trim() },
      });
      onSaved(updated);
      updateStoredUser({ username: updated.username, profilePublic: updated.profilePublic });
      setUsername(updated.username || u);
      setIsPublic(!!updated.profilePublic);
      toast.success(updated.profilePublic ? "Ochiq profil saqlandi" : "Profil yopildi");
    } catch (err) {
      const field = (err as { response?: { data?: { field?: string } } })?.response?.data?.field;
      const msg = errorMessage(err);
      if (field) setErrors({ [field]: msg });
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const copy = async () => {
    if (await copyText(link)) toast.success("Havola nusxalandi — rezyumega yoki HR'ga yuboring");
  };

  return (
    <div ref={ref} id="public-profile" className="scroll-mt-24">
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 max-w-xl">
            <h2 className="text-[17px] font-bold text-ink">Ochiq profil</h2>
            <p className="mt-1 text-[14px] text-ink-2 leading-relaxed">
              Ish beruvchiga yuboriladigan havola: qabul qilingan yechimlaringiz, test natijalari va mentor bahosi. Telefon raqamingiz va boshqa shaxsiy ma'lumotlar ko'rinmaydi.
            </p>
          </div>
          <Toggle
            checked={isPublic}
            onChange={(v) => {
              setIsPublic(v);
              void save(undefined, { profilePublic: v });
            }}
            label={isPublic ? "Ochiq" : "Yopiq"}
          />
        </div>

        {user.profilePublic && savedUsername && (
          <div className="mt-4 rounded-xl bg-brand-tint px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            <a href={`/u/${savedUsername}`} className="font-semibold text-brand break-all mr-auto">
              devready.uz/u/{savedUsername}
            </a>
            <button type="button" onClick={copy} className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-brand hover:text-brand-deep cursor-pointer">
              <HiOutlineLink size={16} /> Nusxalash
            </button>
            <Link to={`/u/${savedUsername}`} className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-ink-2 hover:text-ink">
              <HiOutlineArrowTopRightOnSquare size={16} /> Ko'rish
            </Link>
            <span className="inline-flex items-center gap-1.5 text-[13px] text-muted w-full sm:w-auto">
              <HiOutlineEye size={15} /> {user.profileViews || 0} marta ko'rilgan
            </span>
          </div>
        )}

        <form onSubmit={save} className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Taxallus" error={errors.username} hint="Havola shu bilan bo'ladi: devready.uz/u/taxallus" className="sm:col-span-2">
            <div className={cx("flex items-stretch rounded-xl border bg-surface overflow-hidden transition focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/10", errors.username ? "border-rose-400" : "border-line")}>
              <span className="px-3 inline-flex items-center text-[15px] text-muted bg-mist border-r border-line select-none">devready.uz/u/</span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20))}
                className="flex-1 min-w-0 py-2.5 px-3 bg-transparent text-[15px] text-ink outline-none"
                aria-label="Taxallus"
                autoComplete="off"
                spellCheck={false}
              />
            </div>
          </Field>
          <Field label="O'zingiz haqingizda" hint="2–3 gap: nimani bilasiz va qanday ish qidiryapsiz" className="sm:col-span-2">
            <Textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={500} rows={3} placeholder="React va TypeScript bilan ishlayman. Toshkentda junior frontend lavozimini qidiryapman." />
          </Field>
          <Field label="GitHub" error={errors["links.github"]}>
            <Input value={github} onChange={(e) => setGithub(e.target.value)} placeholder="https://github.com/login" inputMode="url" />
          </Field>
          <Field label="LinkedIn" error={errors["links.linkedin"]}>
            <Input value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="https://linkedin.com/in/profil" inputMode="url" />
          </Field>
          <Field label="Telegram" error={errors["links.telegram"]}>
            <Input value={telegram} onChange={(e) => setTelegram(e.target.value)} placeholder="@taxallus" />
          </Field>
          <div className="sm:col-span-2 flex flex-col gap-2 pt-1">
            <Toggle checked={showWork} onChange={setShowWork} label="Yechimlarim kodi va maketlarini ham ko'rsatish" />
            {showWork && (
              <Alert tone="warning">Kod ochiq bo'lsa, ish beruvchi uni ko'ra oladi — lekin boshqa talabalar ham ko'chirib olishi mumkin. Yopiq bo'lsa, faqat baho va izohlar ko'rinadi.</Alert>
            )}
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <Button type="submit" loading={saving} disabled={!dirty}>
              Saqlash
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
