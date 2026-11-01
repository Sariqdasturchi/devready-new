import { useEffect, useRef, useState } from "react";
import { FiExternalLink } from "react-icons/fi";
import { authApi, errorMessage } from "../../api/api";
import { getStoredUser, updateStoredUser } from "../../lib/auth";
import { BOT_USERNAME } from "../../lib/constants";
import { Card } from "../ui";

/**
 * Google/GitHub orqali kirgan talabada Telegram yo'q — natija, eslatma va yangi tasklar xabari bormaydi.
 * Bir bosishda ulash: t.me/<bot>?start=reg_<token> → bot ulaydi → sahifa o'zi yangilanadi.
 * variant="card" — kabinet bosh sahifasi, "inline" — sozlamalar.
 */
export default function TelegramConnect({ variant = "card" }: { variant?: "card" | "inline" }) {
  const [connected, setConnected] = useState(() => Boolean(getStoredUser()?.telegramId));
  const [link, setLink] = useState<string | null>(null);
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  // Telegram'da tasdiqlanguncha 3 soniyada bir tekshiramiz (5 daqiqagacha)
  const poll = (left = 100) => {
    timer.current = setTimeout(async () => {
      try {
        const me = await authApi.me();
        if (me.telegramId) {
          updateStoredUser({ telegramId: me.telegramId });
          setConnected(true);
          setWaiting(false);
          return;
        }
      } catch {
        /* keyingi urinishda */
      }
      if (left > 0) poll(left - 1);
      else setWaiting(false);
    }, 3000);
  };

  const start = async () => {
    setError("");
    try {
      const r = await authApi.telegramConnect();
      if (r.alreadyConnected) {
        setConnected(true);
        return;
      }
      const url = `https://t.me/${BOT_USERNAME}?start=reg_${r.linkToken}`;
      setLink(url);
      window.open(url, "_blank", "noopener");
      setWaiting(true);
      poll();
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  if (connected) {
    return variant === "inline" ? <p className="text-[14px] text-ink-2">Telegram ulangan — xabarlar @{BOT_USERNAME} orqali keladi.</p> : null;
  }

  const body = (
    <>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-semibold text-ink">Telegram'ni ulang</p>
        <p className="mt-1 text-[14px] text-ink-2 leading-relaxed">
          Mentor bahosi, muddat eslatmalari va yangi tasklar @{BOT_USERNAME} orqali keladi. Bir bosish — Telegram'da <b>Start</b> ni bosing.
        </p>
        {waiting && (
          <p className="mt-2 flex items-center gap-2 text-[13px] text-ink-2" role="status">
            <span className="w-3.5 h-3.5 rounded-full border-2 border-brand/30 border-t-brand animate-spin" />
            Telegram'dan tasdiq kutilmoqda...
            {link && (
              <a href={link} target="_blank" rel="noreferrer" className="font-semibold text-brand hover:underline">
                Qayta ochish
              </a>
            )}
          </p>
        )}
        {error && <p className="mt-2 text-[13px] text-rose-600">{error}</p>}
      </div>
      <button
        type="button"
        onClick={start}
        className="shrink-0 h-10 px-5 rounded-full border border-line bg-surface hover:border-ink text-[14px] font-semibold text-ink inline-flex items-center gap-2 cursor-pointer"
      >
        Telegram'ni ulash <FiExternalLink size={14} />
      </button>
    </>
  );

  return variant === "inline" ? (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3">{body}</div>
  ) : (
    <Card className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">{body}</Card>
  );
}
