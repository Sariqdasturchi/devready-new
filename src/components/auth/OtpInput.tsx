import { useRef, type ClipboardEvent, type KeyboardEvent } from "react";

/** 6 xonali kod kiritish (paste qo'llab-quvvatlanadi) */
export default function OtpInput({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] || "");

  const setAt = (index: number, char: string) => {
    const next = digits.slice();
    next[index] = char;
    onChange(next.join("").slice(0, 6));
  };

  const handleChange = (index: number, raw: string) => {
    const clean = raw.replace(/\D/g, "");
    if (!clean) return setAt(index, "");
    if (clean.length > 1) {
      // bir nechta raqam yozilgan (avtoto'ldirish)
      const next = (digits.slice(0, index).join("") + clean).slice(0, 6);
      onChange(next);
      refs.current[Math.min(5, next.length)]?.focus();
      return;
    }
    setAt(index, clean);
    if (index < 5) refs.current[index + 1]?.focus();
  };

  const handleKey = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) refs.current[index - 1]?.focus();
    if (e.key === "ArrowLeft" && index > 0) refs.current[index - 1]?.focus();
    if (e.key === "ArrowRight" && index < 5) refs.current[index + 1]?.focus();
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!text) return;
    e.preventDefault();
    onChange(text);
    refs.current[Math.min(5, text.length)]?.focus();
  };

  return (
    <div className="flex gap-2 justify-between">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={6}
          value={d}
          disabled={disabled}
          autoFocus={i === 0}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKey(i, e)}
          onPaste={handlePaste}
          aria-label={`Kod ${i + 1}-raqami`}
          className="w-11 h-14 sm:w-12 rounded-xl border border-line bg-white text-center text-xl font-bold font-mono text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 disabled:opacity-50"
        />
      ))}
    </div>
  );
}
