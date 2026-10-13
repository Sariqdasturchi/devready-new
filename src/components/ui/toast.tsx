import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { HiOutlineCheckCircle, HiOutlineExclamationTriangle, HiOutlineInformationCircle } from "react-icons/hi2";

type ToastType = "success" | "error" | "info";
type ToastItem = { id: number; type: ToastType; message: string };

const ToastContext = createContext<{ show: (type: ToastType, message: string) => void } | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const show = useCallback((type: ToastType, message: string) => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev.slice(-3), { id, type, message }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 4500);
  }, []);

  const value = useMemo(() => ({ show }), [show]);
  const icon = { success: HiOutlineCheckCircle, error: HiOutlineExclamationTriangle, info: HiOutlineInformationCircle };
  const color = {
    success: "text-brand-300",
    error: "text-rose-400",
    info: "text-white/70",
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 left-4 sm:left-auto z-[200] flex flex-col gap-2 sm:w-96" aria-live="polite">
        {items.map((t) => {
          const Icon = icon[t.type];
          return (
            <div key={t.id} className={`flex items-start gap-3 rounded-2xl bg-night border border-white/10 px-4 py-3.5 shadow-[0_20px_50px_-15px_rgba(11,16,32,0.5)] text-[14px] ${color[t.type]}`}>
              <Icon size={20} className="shrink-0 mt-0.5" />
              <span className="text-white leading-snug">{t.message}</span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const ctx = useContext(ToastContext);
  const show = ctx?.show;
  const api = useMemo(
    () => ({
      success: (m: string) => show?.("success", m),
      error: (m: string) => show?.("error", m),
      info: (m: string) => show?.("info", m),
    }),
    [show],
  );
  if (!ctx) throw new Error("useToast ToastProvider ichida ishlatilishi kerak");
  return api;
}
