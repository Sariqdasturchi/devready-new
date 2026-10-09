import { useMemo } from "react";
import { localDateKey } from "../../lib/format";

const MONTHS = ["Yan", "Fev", "Mar", "Apr", "May", "Iyn", "Iyl", "Avg", "Sen", "Okt", "Noy", "Dek"];
const LEVELS = ["bg-mist", "bg-brand/25", "bg-brand/55", "bg-brand"];
const CELL = 13;
const GAP = 3;

/** GitHub uslubidagi faollik kalendari. data: { 'YYYY-MM-DD': 0..3 } (mahalliy sana) */
export default function ActivityCalendar({ data }: { data: Record<string, number> }) {
  const { weeks, months, activeDays } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(today);
    start.setDate(start.getDate() - 7 * 52 - start.getDay());

    const weeks: { key: string; level: number; future: boolean }[][] = [];
    const months: { label: string; col: number }[] = [];
    const cur = new Date(start);
    let lastMonth = -1;
    while (cur <= today) {
      const week: { key: string; level: number; future: boolean }[] = [];
      for (let d = 0; d < 7; d++) {
        const key = localDateKey(cur);
        if (d === 0 && cur.getMonth() !== lastMonth) {
          months.push({ label: MONTHS[cur.getMonth()], col: weeks.length });
          lastMonth = cur.getMonth();
        }
        week.push({ key, level: Math.min(3, data[key] || 0), future: cur > today });
        cur.setDate(cur.getDate() + 1);
      }
      weeks.push(week);
    }
    return { weeks, months, activeDays: Object.values(data).filter((v) => v > 0).length };
  }, [data]);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-muted">
          So'nggi yilda <span className="text-ink font-semibold">{activeDays}</span> kun faol
        </p>
        <div className="flex items-center gap-1 text-[10px] text-muted">
          Kam
          {LEVELS.map((c) => (
            <span key={c} className={`w-2.5 h-2.5 rounded-sm ${c}`} />
          ))}
          Ko'p
        </div>
      </div>
      <div className="overflow-x-auto pb-1">
        <div className="relative" style={{ width: weeks.length * (CELL + GAP), paddingTop: 16 }}>
          {months.map((m) => (
            <span key={`${m.label}-${m.col}`} className="absolute top-0 text-[10px] text-muted" style={{ left: m.col * (CELL + GAP) }}>
              {m.label}
            </span>
          ))}
          <div className="flex" style={{ gap: GAP }}>
            {weeks.map((w, i) => (
              <div key={i} className="flex flex-col" style={{ gap: GAP }}>
                {w.map((d) => (
                  <span
                    key={d.key}
                    title={d.future ? "" : `${d.key}${d.level ? "" : " — faollik yo'q"}`}
                    className={`rounded-[3px] ${d.future ? "opacity-0" : LEVELS[d.level]}`}
                    style={{ width: CELL, height: CELL }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
