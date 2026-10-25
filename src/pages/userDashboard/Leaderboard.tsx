import { useEffect, useState } from "react";
import { HiOutlineTrophy } from "react-icons/hi2";
import { leaderboardApi } from "../../api/api";
import { useCachedQuery } from "../../hooks/useCachedQuery";
import { Avatar, Button, Card, EmptyState, ErrorState, PageHeader, PageLoader, Select, Table, Tabs, cx } from "../../components/ui";
import { ACTIVE_TRACKS } from "../../lib/constants";
import { getStoredUser } from "../../lib/auth";
import type { LeaderboardRow } from "../../types/type";

type Period = "overall" | "weekly" | "monthly";

export default function Leaderboard() {
  const [period, setPeriod] = useState<Period>("overall");
  const [track, setTrack] = useState("");
  const [page, setPage] = useState<number | "me">(1);
  const me = getStoredUser();
  const query = useCachedQuery(`leaderboard:${period}:${track}:${page}`, () => leaderboardApi.get(period, track || undefined, page), { staleTime: 30_000 });

  // Davr yoki yo'nalish o'zgarsa — birinchi sahifaga qaytamiz
  useEffect(() => setPage(1), [period, track]);

  const rows: LeaderboardRow[] = query.data?.data || [];
  const top3: LeaderboardRow[] = query.data?.top || [];
  const myRow = query.data?.me;
  const pg = query.data?.pagination;
  const current = pg?.page || 1;
  const isMe = (r: LeaderboardRow) => r.userId === (me?._id || me?.id);
  const meOnPage = rows.some(isMe);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Liderboard"
        subtitle="Eng faol talabalar reytingi"
        actions={
          <>
            <Tabs
              value={period}
              onChange={setPeriod}
              items={[
                { value: "overall", label: "Umumiy" },
                { value: "monthly", label: "Oylik" },
                { value: "weekly", label: "Haftalik" },
              ]}
            />
            <Select value={track} onChange={(e) => setTrack(e.target.value)} className="w-44">
              <option value="">Barcha yo'nalishlar</option>
              {ACTIVE_TRACKS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </>
        }
      />

      {query.loading ? (
        <PageLoader />
      ) : query.error ? (
        <ErrorState message={query.error} onRetry={query.refetch} />
      ) : !pg || pg.total === 0 ? (
        <Card>
          <EmptyState icon={<HiOutlineTrophy />} title="Bu davrda hali natija yo'q" text="Task bajaring va reytingda birinchi bo'ling!" />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {top3.map((r, i) => {
              const first = i === 0;
              return (
                <div
                  key={r.userId}
                  className={cx(
                    "rounded-[18px] p-5 flex items-center gap-4 border",
                    first ? "bg-brand border-brand text-white" : "bg-surface border-line text-ink",
                    isMe(r) && (first ? "ring-2 ring-brand-300 ring-offset-2 ring-offset-paper" : "ring-2 ring-brand"),
                  )}
                >
                  <span className={cx("text-[34px] font-extrabold tracking-tight w-8 tabular-nums", first ? "text-brand-on" : "text-muted")}>{r.rank}</span>
                  <Avatar name={r.fullName} src={r.avatar} size={44} />
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold truncate">
                      {r.fullName} {isMe(r) && <span className={first ? "text-brand-on" : "text-brand"}>(siz)</span>}
                    </p>
                    <p className={cx("text-[13px]", first ? "text-white/75" : "text-muted")}>{r.level}</p>
                    <p className="text-[15px] font-bold mt-1 tabular-nums">{r.points.toLocaleString()} XP</p>
                  </div>
                </div>
              );
            })}
          </div>

          {myRow && (
            <Card className="p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Avatar name={myRow.fullName} src={myRow.avatar} size={36} />
                <div>
                  <p className="text-[13px] text-muted">Sizning o'rningiz</p>
                  <p className="text-[15px] font-bold text-ink tabular-nums">
                    #{myRow.rank} <span className="text-muted font-medium">/ {pg.total}</span> · {myRow.points.toLocaleString()} XP
                  </p>
                </div>
              </div>
              {!meOnPage && (
                <Button size="sm" variant="secondary" onClick={() => setPage(myRow.page)}>
                  O'rnimni ko'rsatish
                </Button>
              )}
            </Card>
          )}

          <Card>
            <Table head={["#", "Talaba", "Daraja", "Tasklar", "XP"]}>
              {rows.map((r) => (
                <tr key={r.userId} className={cx(isMe(r) ? "bg-brand-tint" : "hover:bg-mist")}>
                  <td className="px-4 py-3 font-semibold text-muted w-12 tabular-nums">{r.rank}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={r.fullName} src={r.avatar} size={30} />
                      <span className="font-semibold text-ink whitespace-nowrap">
                        {r.fullName} {isMe(r) && <span className="text-brand text-xs">(siz)</span>}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted whitespace-nowrap">{r.level}</td>
                  <td className="px-4 py-3 text-ink-2">{r.completedTasks}</td>
                  <td className="px-4 py-3 font-bold text-brand whitespace-nowrap">{r.points.toLocaleString()}</td>
                </tr>
              ))}
            </Table>
            {pg.pages > 1 && (
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-line">
                <span className="text-[13px] text-muted tabular-nums">
                  {(current - 1) * pg.limit + 1}–{Math.min(current * pg.limit, pg.total)} / {pg.total} talaba
                </span>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" disabled={current <= 1} onClick={() => setPage(current - 1)}>
                    Oldingi
                  </Button>
                  {pageList(current, pg.pages).map((p, i) =>
                    p === 0 ? (
                      <span key={`gap${i}`} className="px-1 text-muted">…</span>
                    ) : (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPage(p)}
                        aria-current={p === current ? "page" : undefined}
                        className={cx(
                          "min-w-8 h-8 px-2 rounded-full text-[13px] font-medium tabular-nums cursor-pointer",
                          p === current ? "bg-brand text-white" : "text-ink-2 hover:bg-mist",
                          myRow?.page === p && p !== current && "ring-1 ring-brand text-brand",
                        )}
                      >
                        {p}
                      </button>
                    ),
                  )}
                  <Button size="sm" variant="ghost" disabled={current >= pg.pages} onClick={() => setPage(current + 1)}>
                    Keyingi
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

/** Sahifa raqamlari: 1 … 4 5 6 … 12 (0 — oraliq) */
function pageList(current: number, pages: number): number[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const set = new Set([1, pages, current - 1, current, current + 1].filter((p) => p >= 1 && p <= pages));
  const sorted = [...set].sort((a, b) => a - b);
  const out: number[] = [];
  sorted.forEach((p, i) => {
    if (i && p - sorted[i - 1] > 1) out.push(0);
    out.push(p);
  });
  return out;
}
