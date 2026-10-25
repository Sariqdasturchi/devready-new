import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { HiOutlineClock, HiOutlineUsers } from "react-icons/hi2";
import { contestApi, errorCode, errorMessage } from "../../api/api";
import type { Contest, ContestStandings } from "../../types/type";
import { DIFFICULTY } from "../../lib/constants";
import { getStoredUser } from "../../lib/auth";
import { setReturnPath, trackVisit } from "../../lib/track";
import { ErrorState, PageLoader, cx } from "../../components/ui";
import { useToast } from "../../components/ui/toast";
import Seo from "../../components/Seo";

/* ───────── Vaqt ───────── */
const TZ = "Asia/Tashkent";
const WEEKDAYS = [
  "yakshanba",
  "dushanba",
  "seshanba",
  "chorshanba",
  "payshanba",
  "juma",
  "shanba",
];
const MONTHS = [
  "yanvar",
  "fevral",
  "mart",
  "aprel",
  "may",
  "iyun",
  "iyul",
  "avgust",
  "sentabr",
  "oktabr",
  "noyabr",
  "dekabr",
];

/** "31-oktabr, shanba 10:00" — Toshkent vaqti */
function when(iso: string, withDay = true) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: TZ,
      weekday: "short",
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date(iso))
      .map((x) => [x.type, x.value]),
  );
  const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(
    p.weekday,
  );
  return `${p.day}-${MONTHS[Number(p.month) - 1]}${withDay ? `, ${WEEKDAYS[wd]}` : ""} ${p.hour}:${p.minute}`;
}

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return {
    d: Math.floor(s / 86400),
    h: Math.floor((s % 86400) / 3600),
    m: Math.floor((s % 3600) / 60),
    s: s % 60,
  };
}
const pad = (n: number) => String(n).padStart(2, "0");
/** Reyting jadvali uchun qisqa: "<1 daq", "42 daq", "1 s 05 daq" */
const shortDur = (min: number) => (min < 1 ? "<1 daq" : min < 60 ? `${Math.round(min)} daq` : `${Math.floor(min / 60)} s ${pad(Math.round(min % 60))} daq`);
const minutesLabel = (min: number) =>
  min < 60
    ? `${min} daqiqa`
    : min % 60
      ? `${Math.floor(min / 60)} soat ${min % 60} daqiqa`
      : `${min / 60} soat`;

/** Server vaqtiga moslangan, har soniyada yangilanadigan "hozir" */
function useNow(serverTime?: string) {
  const [offset] = useState(() =>
    serverTime ? new Date(serverTime).getTime() - Date.now() : 0,
  );
  const [now, setNow] = useState(() => Date.now() + offset);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now() + offset), 1000);
    return () => clearInterval(t);
  }, [offset]);
  return now;
}

const STATUS_LABEL: Record<Contest["status"], string> = {
  draft: "Qoralama",
  upcoming: "Tez orada",
  live: "Hozir davom etmoqda",
  ended: "Natijalar tekshirilmoqda",
  finished: "Yakunlangan",
};

/**
 * Haftalik musobaqa: devready.uz/contests
 * Bitta task, ochiq oyna (odatda shanba 10:00 — yakshanba 22:00), shaxsiy taymer. Reyting: testlar, keyin vaqt.
 */
export default function Contests() {
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState<{
    current: Contest[];
    past: Contest[];
    serverTime: string;
  } | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    contestApi
      .list()
      .then(setData)
      .catch((e) => setError(errorMessage(e, "Musobaqalarni yuklab bo'lmadi")));
  }, []);

  useEffect(() => {
    trackVisit();
    load();
  }, [load]);

  const all = useMemo(
    () => (data ? [...data.current, ...data.past] : []),
    [data],
  );
  const selectedId = params.get("id");
  const featured = data
    ? data.current.find((c) => c.status === "live") ||
      data.current[0] ||
      data.past[0] ||
      null
    : null;
  const selected =
    (selectedId && all.find((c) => c.id === selectedId)) || featured;

  const select = (id: string) => {
    setParams({ id }, { replace: false });
    document
      .getElementById("contest-main")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <main>
      <Seo
        title="Haftalik musobaqa"
        description="Har hafta bitta amaliy task: shanba 10:00 dan yakshanba 22:00 gacha. Natija avtomatik testlar va vaqt bo'yicha, g'oliblar profilida belgi oladi. Ishtirok bepul."
      />
      <section className="max-w-6xl mx-auto px-5 sm:px-8 pt-14 sm:pt-20 pb-10">
        <h1 className="text-[40px] sm:text-6xl font-extrabold tracking-[-0.045em] leading-[1.03] text-ink max-w-3xl text-balance">
          Har hafta bitta task. Eng to'g'ri va tez yechim yutadi.
        </h1>
        <p className="mt-5 text-lg text-ink-2 max-w-2xl leading-relaxed">
          Musobaqa shanba 10:00 dan yakshanba 22:00 gacha ochiq. Taskni
          ochganingizdan boshlab 3 soat vaqtingiz bor. Ishtirok bepul, g'oliblar
          ochiq profilida belgi oladi.
        </p>
      </section>

      <section
        id="contest-main"
        className="max-w-6xl mx-auto px-5 sm:px-8 pb-16 scroll-mt-24"
      >
        {error ? (
          <ErrorState message={error} onRetry={load} />
        ) : !data ? (
          <PageLoader />
        ) : !selected ? (
          <EmptyContests />
        ) : (
          <div className="grid lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-5 flex flex-col gap-6">
              <ContestCard
                key={selected.id}
                contestId={selected.id}
                initial={selected}
                serverTime={data.serverTime}
                onChanged={load}
              />
              <Rules />
            </div>
            <div className="lg:col-span-7">
              <Standings contest={selected} />
            </div>
          </div>
        )}
      </section>

      {!!data?.past.length && (
        <section
          className="max-w-6xl mx-auto px-5 sm:px-8 pb-24"
          aria-labelledby="archive-title"
        >
          <h2
            id="archive-title"
            className="text-[22px] font-bold tracking-[-0.02em] text-ink mb-4"
          >
            O'tgan musobaqalar
          </h2>
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.past.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => select(c.id)}
                  className={cx(
                    "w-full text-left rounded-2xl border bg-surface p-5 cursor-pointer transition-colors",
                    selected?.id === c.id
                      ? "border-ink"
                      : "border-line hover:border-ink",
                  )}
                >
                  <p className="text-[12px] text-muted">
                    {when(c.startAt, false)}
                  </p>
                  <p className="mt-1.5 text-[16px] font-bold text-ink leading-snug">
                    {c.title}
                  </p>
                  {c.winners.length ? (
                    <ol className="mt-3 flex flex-col gap-1 text-[13px] text-ink-2">
                      {c.winners.map((w) => (
                        <li key={w.place} className="flex gap-2">
                          <span className="w-5 shrink-0 font-semibold text-ink tabular-nums">
                            {w.place}.
                          </span>
                          <span className="truncate">{w.name}</span>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="mt-3 text-[13px] text-muted">
                      {c.status === "ended"
                        ? "Natijalar tekshirilmoqda"
                        : "G'olib aniqlanmadi"}
                    </p>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

function EmptyContests() {
  return (
    <div className="rounded-2xl border border-line bg-surface p-8 max-w-2xl">
      <p className="text-[18px] font-bold text-ink">
        Keyingi musobaqa hali e'lon qilinmagan
      </p>
      <p className="mt-2 text-[15px] text-ink-2 leading-relaxed">
        Ro'yxatdan o'tgan bo'lsangiz, Telegram bot musobaqa boshlanishidan 1 kun
        va 1 soat oldin eslatadi. Hozircha katalogdagi tasklarda mashq qiling.
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        <Link
          to="/tasks"
          className="h-11 px-5 inline-flex items-center rounded-full bg-brand text-white text-sm font-semibold hover:bg-brand-deep"
        >
          Tasklarni ko'rish
        </Link>
        <Link
          to="/register"
          className="h-11 px-5 inline-flex items-center rounded-full border border-line text-sm font-semibold text-ink hover:border-ink"
        >
          Ro'yxatdan o'tish
        </Link>
      </div>
    </div>
  );
}

function Rules() {
  return (
    <div className="rounded-2xl border border-line bg-surface p-6">
      <h2 className="text-[15px] font-bold text-ink">Qoidalar</h2>
      <ol className="mt-3 pl-5 list-decimal flex flex-col gap-2 text-[14px] text-ink-2 leading-relaxed marker:text-muted">
        <li>
          Har bir ishtirokchiga bitta urinish. Taymer taskni ochganingizda
          boshlanadi.
        </li>
        <li>
          O'rin o'tgan avtomatik testlar soni bo'yicha, teng bo'lsa — kim tezroq
          yuborgan.
        </li>
        <li>
          Yechimni AI tekshiradi. Eng yaxshi natijalarning testlari e'londan
          oldin qayta ishga tushiriladi, ko'chirilgan yechimlar chetlatiladi.
        </li>
        <li>
          Musobaqadan keyin task katalogga o'tadi va hamma uni bajara oladi.
        </li>
      </ol>
    </div>
  );
}

function Countdown({ ms }: { ms: number }) {
  const { d, h, m, s } = parts(ms);
  const cells = [
    ...(d ? [[d, "kun"]] : []),
    [h, "soat"],
    [m, "daqiqa"],
    [s, "soniya"],
  ] as [number, string][];
  return (
    <div className="flex gap-2" role="timer" aria-live="off">
      {cells.map(([v, l]) => (
        <div
          key={l}
          className="min-w-[64px] rounded-xl bg-mist px-3 py-2.5 text-center"
        >
          <p className="text-[26px] leading-none font-extrabold tracking-[-0.03em] text-ink tabular-nums">
            {l === "kun" ? v : pad(v)}
          </p>
          <p className="mt-1 text-[11px] text-muted">{l}</p>
        </div>
      ))}
    </div>
  );
}

function ContestCard({
  contestId,
  initial,
  serverTime,
  onChanged,
}: {
  contestId: string;
  initial: Contest;
  serverTime: string;
  onChanged: () => void;
}) {
  const navigate = useNavigate();
  const toast = useToast();
  const user = getStoredUser();
  const [c, setC] = useState<Contest>(initial);
  const [busy, setBusy] = useState(false);
  const now = useNow(serverTime);

  // Kirgan foydalanuvchi uchun o'z ishtiroki bilan qayta yuklaymiz
  useEffect(() => {
    if (!user) return;
    contestApi
      .get(contestId)
      .then(setC)
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contestId]);

  const start = new Date(c.startAt).getTime();
  const end = new Date(c.endAt).getTime();
  // Sahifa ochiq turganda holat o'zgarsa (boshlandi/tugadi) — ro'yxatni yangilaymiz
  const phase =
    c.status === "upcoming" && now >= start
      ? "flip"
      : c.status === "live" && now >= end
        ? "flip"
        : "same";
  useEffect(() => {
    if (phase === "flip") onChanged();
  }, [phase, onChanged]);

  const entry = c.myEntry;
  const entryLive =
    entry?.status === "in_progress" && new Date(entry.dueAt).getTime() > now;

  const join = async () => {
    if (!user) {
      setReturnPath(`/contests?id=${c.id}`);
      navigate("/register");
      return;
    }
    if (user.role !== "user")
      return toast.info("Musobaqada faqat talabalar qatnashadi");
    setBusy(true);
    try {
      const r = await contestApi.start(c.id);
      navigate(`/dashboard/tasks/${r.taskId}/code`);
    } catch (e) {
      toast.error(errorMessage(e));
      if (errorCode(e) === "ALREADY_PLAYED")
        contestApi
          .get(c.id)
          .then(setC)
          .catch(() => undefined);
    } finally {
      setBusy(false);
    }
  };

  const diff = c.task ? DIFFICULTY[c.task.difficulty] || DIFFICULTY.oson : null;
  return (
    <article className="rounded-2xl border border-line bg-surface p-6 sm:p-7">
      <p
        className={cx(
          "inline-flex items-center gap-2 text-[13px] font-semibold",
          c.status === "live" ? "text-brand" : "text-ink-2",
        )}
      >
        {c.status === "live" && (
          <span
            className="w-2 h-2 rounded-full bg-brand animate-pulse"
            aria-hidden="true"
          />
        )}
        {STATUS_LABEL[c.status]}
      </p>
      <h2 className="mt-2 text-[26px] sm:text-[30px] font-extrabold tracking-[-0.03em] leading-tight text-ink text-balance">
        {c.title}
      </h2>
      {c.description && (
        <p className="mt-2 text-[15px] text-ink-2 leading-relaxed">
          {c.description}
        </p>
      )}

      {c.task && (
        <div className="mt-4 flex flex-wrap items-center gap-2 text-[12px]">
          <span className="font-semibold text-ink-2">{c.task.track}</span>
          {diff && (
            <span
              className={`px-2 py-0.5 rounded-md border font-semibold ${diff.className}`}
            >
              {diff.label}
            </span>
          )}
          <span className="text-muted">{c.task.xp} XP</span>
        </div>
      )}

      {(c.status === "upcoming" || c.status === "live") && (
        <div className="mt-6">
          <p className="text-[13px] text-muted mb-2">
            {c.status === "upcoming"
              ? "Boshlanishiga"
              : entryLive
                ? "Sizning vaqtingiz"
                : "Tugashiga"}
          </p>
          <Countdown
            ms={
              c.status === "upcoming"
                ? start - now
                : entryLive
                  ? new Date(entry!.dueAt).getTime() - now
                  : end - now
            }
          />
        </div>
      )}

      <dl className="mt-6 grid grid-cols-2 gap-4 text-[13px]">
        <div>
          <dt className="text-muted">Ochiq</dt>
          <dd className="mt-0.5 font-semibold text-ink">
            {when(c.startAt)} — {when(c.endAt)}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Har bir ishtirokchiga</dt>
          <dd className="mt-0.5 font-semibold text-ink inline-flex items-center gap-1">
            <HiOutlineClock size={14} /> {minutesLabel(c.timeLimitMin)}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Ishtirokchilar</dt>
          <dd className="mt-0.5 font-semibold text-ink inline-flex items-center gap-1">
            <HiOutlineUsers size={14} /> {c.participants}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Vaqt mintaqasi</dt>
          <dd className="mt-0.5 font-semibold text-ink">Toshkent (UTC+5)</dd>
        </div>
      </dl>

      <div className="mt-6 pt-5 border-t border-line">
        {c.status === "live" && entryLive ? (
          <Link
            to={`/dashboard/tasks/${c.task?.id}/code`}
            className="h-12 w-full inline-flex items-center justify-center rounded-full bg-brand text-white text-[15px] font-semibold hover:bg-brand-deep"
          >
            Davom ettirish
          </Link>
        ) : c.status === "live" && entry ? (
          <p className="text-[14px] text-ink-2">
            {entry.submittedAt
              ? `Yechimingiz qabul qilindi${entry.testResults ? `: ${entry.testResults.passed}/${entry.testResults.total} test` : ""}. Natijalar musobaqa tugagach e'lon qilinadi.`
              : "Sizga ajratilgan vaqt tugagan. Keyingi musobaqada qatnashing."}
          </p>
        ) : c.status === "live" ? (
          <button
            type="button"
            onClick={join}
            disabled={busy}
            className="h-12 w-full inline-flex items-center justify-center rounded-full bg-brand text-white text-[15px] font-semibold hover:bg-brand-deep cursor-pointer disabled:opacity-60"
          >
            {user ? "Taskni ochish va boshlash" : "Ro'yxatdan o'tib qatnashish"}
          </button>
        ) : c.status === "upcoming" ? (
          <p className="text-[14px] text-ink-2 leading-relaxed">
            {user
              ? "Telegram bot boshlanishidan 1 kun va 1 soat oldin eslatadi. Task musobaqa boshlanganda ochiladi."
              : "Ro'yxatdan o'ting — Telegram bot musobaqa boshlanishidan oldin eslatadi."}
            {!user && (
              <Link
                to="/register"
                onClick={() => setReturnPath(`/contests?id=${c.id}`)}
                className="ml-1 font-semibold text-brand hover:underline"
              >
                Ro'yxatdan o'tish
              </Link>
            )}
          </p>
        ) : c.status === "ended" ? (
          <p className="text-[14px] text-ink-2">
            Musobaqa tugadi. Eng yaxshi yechimlar tekshirilmoqda, natijalar tez
            orada e'lon qilinadi.
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-[14px] text-ink-2 flex-1 min-w-[180px]">
              Task endi katalogda — uni istalgan vaqt bajarishingiz mumkin.
            </p>
            {c.task && (
              <Link
                to={`/try/${c.task.id}`}
                className="h-10 px-4 inline-flex items-center rounded-full border border-line text-sm font-semibold text-ink hover:border-ink"
              >
                Taskni sinab ko'rish
              </Link>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

function Standings({ contest }: { contest: Contest }) {
  const [data, setData] = useState<ContestStandings | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let stop = false;
    const load = () =>
      contestApi
        .leaderboard(contest.id)
        .then((d) => !stop && (setData(d), setError("")))
        .catch(
          (e) =>
            !stop && setError(errorMessage(e, "Reytingni yuklab bo'lmadi")),
        );
    setData(null);
    load();
    // Musobaqa davomida reyting har 30 soniyada yangilanadi
    const t = contest.status === "live" ? setInterval(load, 30_000) : undefined;
    return () => {
      stop = true;
      if (t) clearInterval(t);
    };
  }, [contest.id, contest.status]);

  const me = getStoredUser();
  return (
    <section
      className="rounded-2xl border border-line bg-surface overflow-hidden"
      aria-labelledby="standings-title"
    >
      <div className="px-6 pt-6 pb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="standings-title" className="text-[18px] font-bold text-ink">
          {contest.status === "finished" ? "Natijalar" : "Reyting"}
        </h2>
        {data && (
          <p className="text-[13px] text-muted">
            {data.submitted} ta yechim · {data.started} ta ishtirokchi
            {contest.status === "live" && " · har 30 soniyada yangilanadi"}
          </p>
        )}
      </div>
      {error ? (
        <p className="px-6 pb-6 text-[14px] text-rose-600">{error}</p>
      ) : !data ? (
        <p className="px-6 pb-6 text-[14px] text-muted">Yuklanmoqda...</p>
      ) : contest.status === "upcoming" ? (
        <p className="px-6 pb-8 text-[14px] text-muted">
          Reyting musobaqa boshlangach shu yerda chiqadi.
        </p>
      ) : !data.rows.length ? (
        <p className="px-6 pb-8 text-[14px] text-muted">
          Hali hech kim yechim yubormagan.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[14px]">
            <thead>
              <tr className="border-y border-line bg-mist/60 text-left text-[12px] text-muted">
                <th scope="col" className="px-6 py-2.5 font-medium w-14">
                  O'rin
                </th>
                <th scope="col" className="px-2 py-2.5 font-medium">
                  Ishtirokchi
                </th>
                <th scope="col" className="px-2 py-2.5 font-medium text-right">
                  Testlar
                </th>
                <th scope="col" className="px-6 py-2.5 font-medium text-right">
                  Vaqt
                </th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => {
                const mine = !!me && String(me._id || me.id) === r.userId;
                return (
                  <tr
                    key={r.userId}
                    className={cx(
                      "border-b border-line last:border-b-0",
                      mine && "bg-brand-tint",
                    )}
                  >
                    <td className="px-6 py-3 font-bold text-ink tabular-nums">
                      {r.place ?? "—"}
                    </td>
                    <td className="px-2 py-3">
                      {r.username ? (
                        <Link
                          to={`/u/${r.username}`}
                          className="font-medium text-ink hover:text-brand"
                        >
                          {r.name}
                        </Link>
                      ) : (
                        <span className="font-medium text-ink">{r.name}</span>
                      )}
                      {mine && (
                        <span className="ml-2 text-[12px] text-brand font-semibold">
                          siz
                        </span>
                      )}
                    </td>
                    <td
                      className={cx(
                        "px-2 py-3 text-right tabular-nums",
                        r.total && r.passed === r.total
                          ? "text-emerald-700 dark:text-emerald-400 font-semibold"
                          : "text-ink-2",
                      )}
                    >
                      {r.passed}/{r.total}
                    </td>
                    <td className="px-6 py-3 text-right tabular-nums text-ink-2 whitespace-nowrap">
                      {shortDur(r.durationMin)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
