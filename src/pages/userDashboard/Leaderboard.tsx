import { useState } from "react";
import { HiOutlineTrophy } from "react-icons/hi2";
import { leaderboardApi } from "../../api/api";
import { useCachedQuery } from "../../hooks/useCachedQuery";
import { Avatar, Card, EmptyState, ErrorState, PageHeader, PageLoader, Select, Table, Tabs, cx } from "../../components/ui";
import { TRACKS } from "../../lib/constants";
import { getStoredUser } from "../../lib/auth";
import type { LeaderboardRow } from "../../types/type";

type Period = "overall" | "weekly" | "monthly";

export default function Leaderboard() {
  const [period, setPeriod] = useState<Period>("overall");
  const [track, setTrack] = useState("");
  const me = getStoredUser();
  const query = useCachedQuery(`leaderboard:${period}:${track}`, () => leaderboardApi.get(period, track || undefined), { staleTime: 30_000 });

  const rows: LeaderboardRow[] = query.data?.data || [];
  const myRow = query.data?.me;
  const isMe = (r: LeaderboardRow) => r.userId === (me?._id || me?.id);
  const top3 = rows.slice(0, 3);

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
              {TRACKS.map((t) => (
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
      ) : rows.length === 0 ? (
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
                    first ? "bg-ink border-ink text-white" : "bg-white border-line text-ink",
                    isMe(r) && "ring-2 ring-brand",
                  )}
                >
                  <span className={cx("text-[34px] font-extrabold tracking-tight w-8 tabular-nums", first ? "text-[#8fa6ff]" : "text-muted")}>{r.rank}</span>
                  <Avatar name={r.fullName} src={r.avatar} size={44} />
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold truncate">
                      {r.fullName} {isMe(r) && <span className={first ? "text-[#8fa6ff]" : "text-brand"}>(siz)</span>}
                    </p>
                    <p className={cx("text-[13px]", first ? "text-white/60" : "text-muted")}>{r.level}</p>
                    <p className="text-[15px] font-bold mt-1 tabular-nums">{r.points.toLocaleString()} XP</p>
                  </div>
                </div>
              );
            })}
          </div>

          {myRow && !rows.slice(0, 50).some(isMe) && (
            <Card className="p-4 border-brand/30 flex items-center justify-between">
              <span className="text-sm text-ink-2">Sizning o'rningiz</span>
              <span className="text-sm font-bold text-ink">
                #{myRow.rank} · {myRow.points} XP
              </span>
            </Card>
          )}

          <Card>
            <Table head={["#", "Talaba", "Daraja", "Tasklar", "XP"]}>
              {rows.slice(0, 50).map((r) => (
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
          </Card>
        </>
      )}
    </div>
  );
}
