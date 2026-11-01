import { useEffect, useState } from "react";
import { FaGithub } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import { authApi, oauthStartUrl, type OAuthProvider } from "../../api/api";
import { anonId, readTryReturn, source, track } from "../../lib/track";

const LABEL: Record<OAuthProvider, string> = { google: "Google", github: "GitHub" };

// Sahifalar orasida bir marta so'raladi
let cached: OAuthProvider[] | null = null;

/**
 * "Google bilan davom etish" / "GitHub bilan davom etish".
 * Faqat serverda sozlangan provayderlar ko'rinadi (GOOGLE_CLIENT_ID, GITHUB_CLIENT_ID) — sozlanmagan bo'lsa hech narsa chiqmaydi.
 * Kirish va ro'yxatdan o'tish bir xil: akkaunt bo'lmasa yaratiladi.
 */
export default function SocialAuth({ returnTo }: { returnTo?: string | null }) {
  const [providers, setProviders] = useState<OAuthProvider[]>(cached || []);
  const [going, setGoing] = useState<OAuthProvider | null>(null);

  useEffect(() => {
    if (cached) return;
    authApi
      .oauthProviders()
      .then((list) => {
        cached = list;
        setProviders(list);
      })
      .catch(() => undefined);
  }, []);

  if (!providers.length) return null;

  const go = (p: OAuthProvider) => {
    setGoing(p);
    track(p === "google" ? "register_google" : "register_github");
    // Ro'yxatdan o'tmasdan sinab ko'rilgan task bo'lsa — kirgandan keyin o'sha taskka qaytamiz
    const tried = readTryReturn();
    window.location.assign(oauthStartUrl(p, {
      source: source(),
      anonId: anonId(),
      returnTo: tried ? `/dashboard/tasks/${tried.taskId}` : returnTo,
    }));
  };

  return (
    <div className="flex flex-col gap-2.5">
      {providers.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => go(p)}
          disabled={!!going}
          className="w-full h-12 rounded-full border border-line bg-surface hover:border-ink text-[15px] font-semibold text-ink flex items-center justify-center gap-2.5 cursor-pointer transition-colors disabled:opacity-60"
        >
          {p === "google" ? <FcGoogle size={20} aria-hidden /> : <FaGithub size={19} aria-hidden />}
          {going === p ? "Yo'naltirilmoqda..." : `${LABEL[p]} bilan davom etish`}
        </button>
      ))}
      <div className="flex items-center gap-3 my-1 text-[13px] text-muted" aria-hidden>
        <span className="h-px flex-1 bg-line" />
        yoki telefon raqam bilan
        <span className="h-px flex-1 bg-line" />
      </div>
    </div>
  );
}
