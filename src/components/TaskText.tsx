import Markdown from "./Markdown";
import { cx } from "./ui";

/** Task shartlari: qisqa tavsif (lead) + Markdown matn. Barcha joyda bir xil ko'rinadi. */
export function TaskText({ description, content, className }: { description?: string; content?: string; className?: string }) {
  return (
    <div className={cx("min-w-0", className)}>
      {description && <p className="mb-4 text-[15px] leading-relaxed text-ink">{description}</p>}
      {content && (
        <div className="pt-4 border-t border-line">
          <Markdown text={content} size="compact" />
        </div>
      )}
    </div>
  );
}

/** Talablar — raqamlangan; AI va mentor aynan shu ro'yxat bo'yicha baholaydi */
export function TaskRequirements({ items, className }: { items?: string[]; className?: string }) {
  if (!items?.length) return null;
  return (
    <ol className={cx("flex flex-col gap-2.5", className)}>
      {items.map((r, i) => (
        <li key={i} className="flex gap-3 text-[14px] leading-relaxed text-ink-2">
          <span className="shrink-0 w-6 h-6 rounded-full bg-brand-tint text-brand text-[12px] font-bold inline-flex items-center justify-center tabular-nums mt-px">{i + 1}</span>
          <span className="min-w-0">
            <InlineCode text={r} />
          </span>
        </li>
      ))}
    </ol>
  );
}

/** `kod` qismlarini ajratib ko'rsatadi (talablar ro'yxati uchun) */
export function InlineCode({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("`") && p.endsWith("`") && p.length > 2 ? (
          <code key={i} className="px-1 py-px rounded bg-mist font-mono text-[0.86em] text-ink [box-decoration-break:clone]">
            {p.slice(1, -1)}
          </code>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}
