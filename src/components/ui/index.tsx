import { useEffect, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { createPortal } from "react-dom";
import { HiOutlineXMark } from "react-icons/hi2";
import { STATUS, TONE_CLASS, type Tone } from "../../lib/constants";
import type { TaskStatus } from "../../types/type";
import { initials, mediaUrl } from "../../lib/format";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

// ─── Button ──────────────────────────────────────────────────────────────
type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline";
const BUTTON: Record<ButtonVariant, string> = {
  primary: "bg-brand text-white hover:bg-brand-deep",
  secondary: "bg-ink text-white hover:bg-ink-2",
  outline: "border border-line text-ink hover:border-ink bg-white",
  ghost: "text-ink-2 hover:bg-mist hover:text-ink",
  danger: "bg-white text-rose-600 border border-rose-200 hover:bg-rose-50",
};

export function Button({
  variant = "primary",
  size = "md",
  loading,
  className,
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: "sm" | "md" | "lg"; loading?: boolean }) {
  const sizes = { sm: "h-8 px-3 text-[13px]", md: "h-10 px-4 text-sm", lg: "h-12 px-6 text-[15px]" };
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap transition-colors disabled:opacity-50 disabled:pointer-events-none cursor-pointer",
        sizes[size],
        BUTTON[variant],
        className,
      )}
    >
      {loading && <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />}
      {children}
    </button>
  );
}

// ─── Card ────────────────────────────────────────────────────────────────
export function Card({ className, children, ...rest }: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...rest} className={cx("rounded-[18px] border border-line bg-white", className)}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 px-5 pt-5 pb-3">
      <div className="min-w-0">
        <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
        {subtitle && <p className="text-[13px] text-muted mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// ─── Badges ──────────────────────────────────────────────────────────────
export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[12px] font-medium whitespace-nowrap", TONE_CLASS[tone], className)}>
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: TaskStatus }) {
  const cfg = STATUS[status] || STATUS.not_started;
  return <Badge tone={cfg.tone}>{cfg.label}</Badge>;
}

// ─── States ──────────────────────────────────────────────────────────────
export function Spinner({ className }: { className?: string }) {
  return <span className={cx("inline-block w-8 h-8 border-[3px] border-brand-tint border-t-brand rounded-full animate-spin", className)} />;
}

export function PageLoader({ label = "Yuklanmoqda..." }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[320px] gap-3" role="status">
      <Spinner />
      <p className="text-[13px] text-muted">{label}</p>
    </div>
  );
}

export function EmptyState({ icon, title, text, action }: { icon?: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6 gap-2">
      {icon && <div className="text-3xl text-muted/60 mb-1">{icon}</div>}
      <p className="text-[15px] font-semibold text-ink">{title}</p>
      {text && <p className="text-sm text-muted max-w-sm">{text}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Card className="p-8 text-center max-w-md mx-auto mt-10">
      <p className="text-[15px] text-ink mb-4">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Qayta urinish
        </Button>
      )}
    </Card>
  );
}

export function Alert({ tone = "info", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <div className={cx("rounded-xl border px-4 py-3 text-[13px] leading-relaxed", TONE_CLASS[tone], className)}>{children}</div>;
}

// ─── Page header ─────────────────────────────────────────────────────────
export function PageHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-7">
      <div className="min-w-0">
        <h1 className="text-[26px] sm:text-[32px] font-extrabold text-ink tracking-[-0.035em] leading-tight">{title}</h1>
        {subtitle && <p className="text-[15px] text-muted mt-1.5 max-w-2xl">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

// ─── Stat card ───────────────────────────────────────────────────────────
export function StatCard({ label, value, hint, icon, tone = "success" }: { label: string; value: ReactNode; hint?: ReactNode; icon?: ReactNode; tone?: Tone }) {
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] text-muted">{label}</p>
          <p className="text-[26px] font-bold text-ink mt-2 leading-none tracking-[-0.03em] tabular-nums">{value}</p>
          {hint && <p className="text-[13px] text-muted mt-2">{hint}</p>}
        </div>
        {icon && <div className={cx("w-9 h-9 rounded-full flex items-center justify-center text-lg shrink-0", tone === "info" || tone === "success" ? "bg-brand-tint text-brand" : "bg-mist text-ink-2")}>{icon}</div>}
      </div>
    </Card>
  );
}

// ─── Tabs (segment) ──────────────────────────────────────────────────────
export function Tabs<T extends string>({
  value,
  onChange,
  items,
}: {
  value: T;
  onChange: (v: T) => void;
  items: { value: T; label: ReactNode; count?: number }[];
}) {
  return (
    <div role="tablist" className="flex gap-1 p-1 rounded-full bg-mist border border-line w-fit max-w-full overflow-x-auto [scrollbar-width:none]">
      {items.map((it) => (
        <button
          key={it.value}
          type="button"
          role="tab"
          aria-selected={value === it.value}
          onClick={() => onChange(it.value)}
          className={cx(
            "h-8 px-3.5 rounded-full text-[13px] font-medium transition-colors cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap",
            value === it.value ? "bg-white text-ink shadow-[0_1px_2px_rgba(7,10,19,0.08),0_0_0_1px_var(--color-line)]" : "text-muted hover:text-ink",
          )}
        >
          {it.label}
          {it.count !== undefined && (
            <span className={cx("text-[11px] tabular-nums", value === it.value ? "text-brand" : "text-muted")}>{it.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

// ─── Form controls ───────────────────────────────────────────────────────
const inputBase =
  "rounded-xl border border-line bg-white px-3.5 py-2.5 text-[15px] text-ink placeholder:text-muted/70 focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition disabled:bg-mist disabled:text-muted";

export function Field({ label, hint, error, children, className }: { label?: ReactNode; hint?: ReactNode; error?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cx("flex flex-col gap-1.5", className)}>
      {label && <span className="text-[13px] font-medium text-ink">{label}</span>}
      {children}
      {error ? <span className="text-[13px] text-rose-600">{error}</span> : hint ? <span className="text-[12px] text-muted">{hint}</span> : null}
    </label>
  );
}

// Agar tashqaridan kenglik (w-*) berilmasa — to'liq kenglik
const widthOf = (className?: string) => (/(^|\s)w-/.test(className || "") ? "" : "w-full");

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(inputBase, widthOf(props.className), props.className)} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cx(inputBase, "w-full resize-y min-h-[90px]", props.className)} />;
}

export function Select({ children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={cx(inputBase, widthOf(props.className), "appearance-none cursor-pointer pr-9 bg-[url(\"data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 12 12%27%3E%3Cpath d=%27M3 4.5l3 3 3-3%27 fill=%27none%27 stroke=%27%23697386%27 stroke-width=%271.5%27/%3E%3C/svg%3E\")] bg-[length:12px] bg-[right_0.85rem_center] bg-no-repeat", props.className)}>
      {children}
    </select>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: ReactNode }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="inline-flex items-center gap-2.5 cursor-pointer select-none">
      <span className={cx("relative w-10 h-6 rounded-full transition-colors", checked ? "bg-brand" : "bg-line")}>
        <span className={cx("absolute top-1 w-4 h-4 rounded-full bg-white transition-all", checked ? "left-5" : "left-1")} />
      </span>
      {label && <span className="text-sm text-ink">{label}</span>}
    </button>
  );
}

// ─── Modal ───────────────────────────────────────────────────────────────
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  const widths = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" };
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={cx("relative w-full bg-white rounded-t-[22px] sm:rounded-[22px] shadow-[0_30px_80px_-20px_rgba(7,10,19,0.35)] flex flex-col max-h-[92dvh]", widths[size])}
      >
        <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-line">
          <h2 className="text-lg font-bold tracking-[-0.02em] text-ink">{title}</h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-full text-muted hover:text-ink hover:bg-mist cursor-pointer" aria-label="Yopish">
            <HiOutlineXMark size={20} />
          </button>
        </div>
        <div className="px-5 sm:px-6 py-5 overflow-y-auto">{children}</div>
        {footer && <div className="px-5 sm:px-6 py-4 border-t border-line flex flex-wrap justify-end gap-2">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export function ConfirmModal({
  open,
  title,
  text,
  confirmLabel = "Tasdiqlash",
  danger,
  loading,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  text: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button variant={danger ? "danger" : "primary"} loading={loading} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-[15px] leading-relaxed text-ink-2">{text}</div>
    </Modal>
  );
}

// ─── Avatar ──────────────────────────────────────────────────────────────
export function Avatar({ name, src, size = 36 }: { name?: string; src?: string | null; size?: number }) {
  const style = { width: size, height: size, fontSize: Math.max(10, size / 2.8) };
  const [broken, setBroken] = useState(false);
  // Rasm yuklanmasa (fayl o'chgan, server ko'chgan) — bosh harflar ko'rsatiladi
  if (src && !broken)
    return <img src={mediaUrl(src)} alt={name || ""} onError={() => setBroken(true)} style={style} className="rounded-full object-cover ring-1 ring-line shrink-0" />;
  return (
    <span style={style} className="rounded-full bg-ink text-white font-semibold flex items-center justify-center shrink-0">
      {initials(name)}
    </span>
  );
}

// ─── Table helpers ───────────────────────────────────────────────────────
export function Table({ head, children }: { head: ReactNode[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[13px] text-muted border-b border-line">
            {head.map((h, i) => (
              <th key={i} className="px-4 py-3 font-medium whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  );
}

export function ProgressBar({ value, max = 100, tone = "success" }: { value: number; max?: number; tone?: Tone }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const colors: Record<Tone, string> = {
    success: "bg-brand",
    warning: "bg-amber-500",
    danger: "bg-rose-500",
    info: "bg-ink",
    violet: "bg-ink-2",
    neutral: "bg-muted",
  };
  return (
    <div className="w-full h-1.5 rounded-full bg-mist overflow-hidden">
      <div className={cx("h-full rounded-full transition-all", colors[tone])} style={{ width: `${pct}%` }} />
    </div>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export { cx };
