

/** Jadval qatorlari uchun skeleton (Users, Mentors, Submissions, Tasks) */
export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="divide-y divide-slate-100 animate-pulse">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-6 px-6 py-4">
          {Array.from({ length: cols }).map((_, c) => (
            <div
              key={c}
              className="h-3 bg-slate-100 rounded-full"
              style={{ flex: c === 0 ? 2 : 1 }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Karta grid ko'rinishi uchun skeleton (Blogs) */
export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="w-full h-44 bg-slate-100" />
          <div className="p-5 flex flex-col gap-3">
            <div className="h-2.5 w-1/3 bg-slate-100 rounded-full" />
            <div className="h-3.5 w-full bg-slate-100 rounded-full" />
            <div className="h-3 w-2/3 bg-slate-100 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Statistik kartalar uchun skeleton (Dashboard, Submissions, Mentors headeri) */
export function StatCardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-pulse"
      style={{ gridTemplateColumns: `repeat(auto-fit, minmax(200px, 1fr))` }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white p-6 rounded-2xl border border-slate-200 flex items-center justify-between"
        >
          <div className="flex flex-col gap-2 flex-1">
            <div className="h-2.5 w-2/3 bg-slate-100 rounded-full" />
            <div className="h-5 w-1/3 bg-slate-100 rounded-full" />
          </div>
          <div className="w-12 h-12 bg-slate-100 rounded-xl shrink-0" />
        </div>
      ))}
    </div>
  );
}

/** Forma inputlari uchun skeleton (Settings) */
export function FormSkeleton({ fields = 3 }: { fields?: number }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm flex flex-col gap-8 animate-pulse">
      <div className="flex items-center gap-6 pb-6 border-b border-slate-100">
        <div className="w-24 h-24 rounded-2xl bg-slate-100" />
        <div className="flex flex-col gap-2">
          <div className="h-3.5 w-32 bg-slate-100 rounded-full" />
          <div className="h-2.5 w-48 bg-slate-100 rounded-full" />
        </div>
      </div>
      <div className="flex flex-col gap-5">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <div className="h-2 w-24 bg-slate-100 rounded-full" />
            <div className="h-10 w-full bg-slate-100 rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Chart uchun skeleton (Dashboard) */
export function ChartSkeleton() {
  return (
    <div className="w-full h-55 flex items-end gap-4 px-4 animate-pulse">
      {[60, 100, 40].map((h, i) => (
        <div key={i} className="flex-1 bg-slate-100 rounded-t-lg" style={{ height: `${h}%` }} />
      ))}
    </div>
  );
}

/** Ro'yxat qatorlari (Dashboard'dagi "Yangi foydalanuvchilar" kabi) uchun skeleton */
export function ListRowsSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="divide-y divide-slate-100 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="p-4 sm:px-6 flex items-center justify-between">
          <div className="flex flex-col gap-1.5">
            <div className="h-3 w-28 bg-slate-100 rounded-full" />
            <div className="h-2.5 w-36 bg-slate-100 rounded-full" />
          </div>
          <div className="h-4 w-12 bg-slate-100 rounded-md" />
        </div>
      ))}
    </div>
  );
}

/** Sahifa sarlavhasi yonida ko'rinadigan, UI'ni bloklamaydigan "orqa fonda yangilanmoqda" indikatori */
export function RefreshingBadge({ show, label = "Yangilanmoqda..." }: { show: boolean; label?: string }) {
  if (!show) return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-blue-500 bg-blue-50 px-2.5 py-1 rounded-full animate-in fade-in duration-200">
      <span className="w-2.5 h-2.5 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      {label}
    </span>
  );
}

/** Kichik inline spinner (tugma ichida ishlatish uchun) */
export function InlineSpinner({ className = "" }: { className?: string }) {
  return (
    <span
      className={`w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block ${className}`}
    />
  );
}