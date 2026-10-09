import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { HiOutlineBell } from "react-icons/hi2";
import { notificationApi } from "../../api/api";
import type { Notification } from "../../types/type";
import { timeAgo } from "../../lib/format";
import { cx } from "../ui";

const POLL_MS = 60_000;

export default function NotificationBell() {
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const load = useCallback(() => {
    notificationApi
      .list()
      .then((r) => {
        setItems(r.data);
        setUnread(r.unread);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const openItem = async (n: Notification) => {
    if (!n.read) {
      notificationApi.read(n._id).catch(() => undefined);
      setItems((prev) => prev.map((x) => (x._id === n._id ? { ...x, read: true } : x)));
      setUnread((u) => Math.max(0, u - 1));
    }
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  const readAll = async () => {
    await notificationApi.readAll().catch(() => undefined);
    setItems((prev) => prev.map((x) => ({ ...x, read: true })));
    setUnread(0);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative w-10 h-10 inline-flex items-center justify-center rounded-full text-ink-2 hover:text-ink hover:bg-mist cursor-pointer"
        aria-label="Bildirishnomalar"
      >
        <HiOutlineBell size={21} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-brand text-[10px] font-bold text-white flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-[min(92vw,380px)] rounded-[18px] border border-line bg-white shadow-[0_24px_60px_-20px_rgba(7,10,19,0.3)] overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-line">
            <span className="text-[15px] font-semibold text-ink">Bildirishnomalar</span>
            {unread > 0 && (
              <button type="button" onClick={readAll} className="text-[13px] text-brand hover:underline cursor-pointer">
                Hammasini o'qildi qilish
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto divide-y divide-line">
            {items.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-muted">Hozircha bildirishnoma yo'q</p>
            ) : (
              items.map((n) => (
                <button
                  key={n._id}
                  type="button"
                  onClick={() => openItem(n)}
                  className={cx("w-full text-left px-4 py-3 hover:bg-mist cursor-pointer flex gap-3", !n.read && "bg-brand-tint/50")}
                >
                  <span className={cx("mt-1.5 w-2 h-2 rounded-full shrink-0", n.read ? "bg-transparent" : "bg-brand")} />
                  <span className="min-w-0">
                    <span className="block text-[14px] font-semibold text-ink">{n.title}</span>
                    {n.message && <span className="block text-[13px] text-ink-2 mt-0.5 line-clamp-2">{n.message}</span>}
                    <span className="block text-[12px] text-muted mt-1">{timeAgo(n.createdAt)}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
