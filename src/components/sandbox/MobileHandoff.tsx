import { useState } from "react";
import { FaTelegramPlane } from "react-icons/fa";
import { HiOutlineLink, HiOutlineXMark } from "react-icons/hi2";
import { track } from "../../lib/track";

const KEY = "dr_handoff_seen";

const isPhone = () => {
  try {
    return window.matchMedia("(max-width: 767px)").matches && window.matchMedia("(pointer: coarse)").matches;
  } catch {
    return false;
  }
};

/**
 * Telefonda ochilgan task (ko'pchilik Instagram/Telegram'dan telefonda keladi): kod yozish noqulay.
 * Havolani o'ziga yuborib, kompyuterda davom ettirish taklifi. Sessiyada bir marta, yopsa qayta chiqmaydi.
 * Voronka: taskni ochganlarning 74% i testni ishga tushirmay chiqib ketayotgan edi.
 */
export default function MobileHandoff({ taskId, title }: { taskId: string; title: string }) {
  const [open, setOpen] = useState(() => {
    if (!isPhone()) return false;
    try {
      return sessionStorage.getItem(KEY) !== "1";
    } catch {
      return true;
    }
  });
  const [copied, setCopied] = useState(false);

  if (!open) return null;
  const close = () => {
    try {
      sessionStorage.setItem(KEY, "1");
    } catch {
      /* e'tiborsiz */
    }
    setOpen(false);
  };
  const url = `${window.location.origin}/try/${taskId}?utm_source=handoff`;
  const share = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(`DevReady: ${title} — kompyuterda davom ettiraman`)}`;

  const copy = async () => {
    track("try_handoff", { taskId });
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40" role="dialog" aria-modal="true" aria-labelledby="handoff-title">
      <div className="w-full rounded-t-3xl bg-paper p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <h2 id="handoff-title" className="text-[18px] font-bold text-ink leading-snug">
            Kompyuterda qulayroq
          </h2>
          <button type="button" onClick={close} aria-label="Yopish" className="p-1 -m-1 text-muted hover:text-ink cursor-pointer">
            <HiOutlineXMark size={22} />
          </button>
        </div>
        <p className="mt-2 text-[15px] text-ink-2 leading-relaxed">
          Kod telefonda ham ishlaydi, lekin kompyuterda yozish ancha oson. Havolani o'zingizga yuboring — kompyuterda ochsangiz shu task ochiladi.
        </p>
        <div className="mt-4 flex flex-col gap-2.5">
          <a
            href={share}
            target="_blank"
            rel="noreferrer"
            onClick={() => {
              track("try_handoff", { taskId });
              close();
            }}
            className="h-12 rounded-full bg-brand hover:bg-brand-deep text-white font-semibold text-[15px] inline-flex items-center justify-center gap-2"
          >
            <FaTelegramPlane size={17} /> Telegram'da o'zimga yuborish
          </a>
          <button
            type="button"
            onClick={copy}
            className="h-12 rounded-full border border-line bg-surface text-ink font-semibold text-[15px] inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            <HiOutlineLink size={17} /> {copied ? "Nusxalandi" : "Havolani nusxalash"}
          </button>
          <button type="button" onClick={close} className="h-11 text-[15px] text-muted hover:text-ink cursor-pointer">
            Telefonda davom etish
          </button>
        </div>
      </div>
    </div>
  );
}
