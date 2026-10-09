import { HiOutlineCheck } from "react-icons/hi2";
import type { Mentor } from "../../types/type";
import { Avatar, cx } from "../ui";

export type MentorType = Mentor;

/** Tekshiruvchi mentorni tanlash — yuklamasi (navbatdagi ishlar) va holati bilan */
export function MentorSelector({ mentors, selectedId, onSelect }: { mentors: Mentor[]; selectedId: string; onSelect: (id: string) => void }) {
  if (!mentors.length) {
    return <p className="text-xs text-muted rounded-xl border border-line p-4">Bu yo'nalish uchun hozircha faol mentor yo'q. AI tekshiruvini tanlang yoki keyinroq urinib ko'ring.</p>;
  }
  return (
    <div className="grid grid-cols-1 gap-2 max-h-72 overflow-y-auto pr-1">
      {mentors.map((m) => {
        const busy = m.isAvailable === false;
        const active = selectedId === m._id;
        return (
          <button
            key={m._id}
            type="button"
            disabled={busy}
            onClick={() => onSelect(m._id)}
            className={cx(
              "w-full text-left flex items-center gap-3 p-3 rounded-xl border transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50",
              active ? "border-brand bg-brand-tint" : "border-line hover:border-ink-2 bg-mist",
            )}
          >
            <Avatar name={m.fullName} src={m.avatar} size={36} />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-ink truncate">{m.fullName}</span>
              <span className="block text-[11px] text-muted">
                {busy ? "Hozir band" : `Navbatda ${m.stats.pending} ta ish`}, tekshirgan: {m.stats.reviewed}
              </span>
            </span>
            <span className={cx("w-5 h-5 rounded-full border flex items-center justify-center shrink-0", active ? "bg-brand border-brand text-white" : "border-line")}>
              {active && <HiOutlineCheck size={12} strokeWidth={3} />}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default MentorSelector;
