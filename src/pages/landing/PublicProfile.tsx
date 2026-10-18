import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  HiOutlineCheckCircle,
  HiOutlineCodeBracket,
  HiOutlinePhoto,
  HiOutlineArrowTopRightOnSquare,
  HiOutlineLink,
  HiOutlineCog6Tooth,
  HiOutlineShieldCheck,
} from "react-icons/hi2";
import { FaGithub, FaLinkedin, FaTelegram } from "react-icons/fa6";
import { errorMessage, publicProfileApi } from "../../api/api";
import type { PublicProfile as Profile, PublicProfileItem, PublicWork, Submission } from "../../types/type";
import { DIFFICULTY } from "../../lib/constants";
import { formatDate, mediaUrl } from "../../lib/format";
import { getStoredUser } from "../../lib/auth";
import { copyText } from "../../lib/clipboard";
import { LANG_LABEL, type CodeLang } from "../../components/sandbox/runners/types";
import { Avatar, Modal, PageLoader, cx } from "../../components/ui";
import { useToast } from "../../components/ui/toast";
import Seo from "../../components/Seo";

const CodeReviewOverlay = lazy(() => import("../../components/sandbox/CodeReviewOverlay"));

const KIND_LABEL = {
  interview: "Suhbat topshirig'i",
  job: "Ishdagi task",
} as const;
/** "Suhbat topshirig'i: URL qisqartiruvchi" → "URL qisqartiruvchi" (tur alohida belgi bilan ko'rsatiladi) */
const cleanTitle = (t: string) => {
  const s = t.replace(/^(Ishdagi( birinchi)? task|Suhbat topshirig'i)\s*:\s*/i, "");
  return s.charAt(0).toLocaleUpperCase("uz") + s.slice(1);
};

/**
 * Ochiq profil: devready.uz/u/<username>
 * Talaba rezyumesiga qo'yadigan havola — ish beruvchi qabul qilingan yechimlar, test natijalari,
 * mentor/AI bahosi va (ruxsat berilgan bo'lsa) kodni ko'radi.
 */
export default function PublicProfile() {
  const { username = "" } = useParams();
  const toast = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<"not_found" | string>("");
  const [work, setWork] = useState<PublicWork | null>(null);
  const [opening, setOpening] = useState<string | null>(null);

  const me = getStoredUser();
  const isOwner = !!me?.username && me.username === username.toLowerCase();
  const url = `${window.location.origin}/u/${username.toLowerCase()}`;

  useEffect(() => {
    setProfile(null);
    setError("");
    // Ko'rishlar soni: egasi emas va shu sessiyada birinchi marta
    let count = false;
    if (!isOwner) {
      try {
        const key = `devready-pv:${username.toLowerCase()}`;
        if (!sessionStorage.getItem(key)) {
          sessionStorage.setItem(key, "1");
          count = true;
        }
      } catch {
        count = false;
      }
    }
    publicProfileApi
      .get(username, count)
      .then(setProfile)
      .catch((e) => setError(e?.response?.status === 404 ? "not_found" : errorMessage(e, "Profilni yuklab bo'lmadi")));
  }, [username, isOwner]);

  const open = useCallback(
    async (item: PublicProfileItem) => {
      setOpening(item.id);
      try {
        setWork(await publicProfileApi.work(username, item.id));
      } catch (e) {
        toast.error(errorMessage(e, "Yechimni ochib bo'lmadi"));
      } finally {
        setOpening(null);
      }
    },
    [username, toast],
  );

  const copy = async () => {
    if (await copyText(url)) toast.success("Havola nusxalandi");
  };

  if (error === "not_found") return <ProfileNotFound />;
  if (error)
    return (
      <main className="max-w-6xl mx-auto px-5 sm:px-8 py-24">
        <Seo title="Profil" noindex />
        <p className="text-ink-2">{error}</p>
      </main>
    );
  if (!profile) return <PageLoader />;

  const p = profile;
  const subtitle = [p.direction, p.level].filter(Boolean).join(" · ");

  return (
    <main>
      <Seo
        title={`${p.fullName} — ${subtitle || "dasturchi"}`}
        description={
          p.stats.approved
            ? `${p.stats.approved} ta real ish va suhbat topshirig'i, mentor/AI tomonidan tekshirilgan. Kod, test natijalari va baholar.`
            : `${p.fullName}ning DevReady'dagi ochiq profili.`
        }
        path={`/u/${p.username}`}
        image={p.avatar ? mediaUrl(p.avatar) : undefined}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "ProfilePage",
          mainEntity: { "@type": "Person", name: p.fullName, url },
        }}
      />

      {isOwner && (
        <div className="border-b border-line bg-brand-tint">
          <div className="max-w-6xl mx-auto px-5 sm:px-8 py-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[14px]">
            <p className="text-ink font-medium mr-auto">Bu sizning ochiq profilingiz — ish beruvchilar shu ko'rinishni ko'radi.</p>
            <button type="button" onClick={copy} className="inline-flex items-center gap-1.5 font-semibold text-brand hover:text-brand-deep cursor-pointer">
              <HiOutlineLink size={16} /> Havolani nusxalash
            </button>
            <Link to="/dashboard/settings#public-profile" className="inline-flex items-center gap-1.5 font-semibold text-ink-2 hover:text-ink">
              <HiOutlineCog6Tooth size={16} /> Sozlamalar
            </Link>
          </div>
        </div>
      )}

      {/* Kim */}
      <section className="max-w-6xl mx-auto px-5 sm:px-8">
        <div className="pt-12 sm:pt-16 pb-10 border-b border-line flex flex-col sm:flex-row sm:items-start gap-6">
          <Avatar name={p.fullName} src={p.avatar} size={96} />
          <div className="min-w-0 flex-1">
            <h1 className="text-[36px] sm:text-5xl font-extrabold tracking-[-0.04em] leading-[1.05] text-ink text-balance">{p.fullName}</h1>
            <p className="mt-2 text-lg text-ink-2">
              {subtitle}
              {subtitle && " · "}
              {p.xp.toLocaleString("ru-RU")} XP
            </p>
            {p.bio && <p className="mt-4 text-[16px] text-ink-2 leading-relaxed max-w-2xl whitespace-pre-line">{p.bio}</p>}
            <ProfileLinksRow links={p.links} />
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-10 grid lg:grid-cols-[minmax(0,1fr)_320px] gap-10 lg:gap-14">
        {/* Yechimlar */}
        <section aria-labelledby="work-title" className="order-2 lg:order-1 min-w-0">
          <h2 id="work-title" className="text-[22px] font-bold tracking-[-0.02em] text-ink">
            Tekshirilgan yechimlar
          </h2>
          <p className="mt-1 text-[14px] text-muted">Real ishdagi ticketlar va kompaniyalar suhbatda beradigan topshiriqlar.</p>

          {p.items.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-line p-8 text-center">
              <p className="font-semibold text-ink">Hali qabul qilingan yechim yo'q</p>
              <p className="mt-1 text-[14px] text-muted">
                {isOwner ? "Birinchi taskni bajaring — tekshiruvdan o'tgan yechim shu yerda paydo bo'ladi." : "Yechimlar tekshiruvdan o'tgach shu yerda ko'rinadi."}
              </p>
              {isOwner && (
                <Link to="/dashboard/tasks" className="mt-4 inline-flex h-10 px-5 items-center rounded-full bg-brand text-white text-sm font-semibold hover:bg-brand-deep">
                  Tasklarga o'tish
                </Link>
              )}
            </div>
          ) : (
            <ol className="mt-6 flex flex-col">
              {p.items.map((it) => (
                <WorkRow key={it.id} item={it} onOpen={() => open(it)} opening={opening === it.id} />
              ))}
            </ol>
          )}
        </section>

        {/* Qisqacha */}
        <aside className="order-1 lg:order-2 flex flex-col gap-8 lg:sticky lg:top-24 self-start w-full">
          <dl className="grid grid-cols-3 lg:grid-cols-1 gap-x-4 gap-y-5">
            <Stat value={p.stats.approved} label="tekshirilgan yechim" />
            <Stat value={p.stats.avgScore ?? "—"} label="o'rtacha baho (100 dan)" />
            <Stat value={`${p.stats.interview} / ${p.stats.job}`} label="suhbat / ishdagi task" />
          </dl>

          {p.skills.length > 0 && (
            <div>
              <h2 className="text-[15px] font-bold text-ink">Amalda isbotlangan</h2>
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {p.skills.map((s) => (
                  <li key={s.name} className="h-8 px-3 inline-flex items-center gap-1.5 rounded-full border border-line text-[13px] text-ink">
                    {s.name}
                    {s.count > 1 && <span className="text-muted">×{s.count}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="hidden lg:flex flex-col gap-8">
            <VerificationNote showWork={p.showWork} showCta={!isOwner && !me} />
          </div>
        </aside>
      </div>

      <div className="lg:hidden max-w-6xl mx-auto px-5 sm:px-8 pb-12 flex flex-col gap-6">
        <VerificationNote showWork={p.showWork} showCta={!isOwner && !me} />
      </div>

      {work && <WorkViewer work={work} onClose={() => setWork(null)} />}
    </main>
  );
}

function VerificationNote({ showWork, showCta }: { showWork: boolean; showCta: boolean }) {
  return (
    <>
      <div className="rounded-2xl bg-mist p-5 text-[13.5px] text-ink-2 leading-relaxed">
        <p className="flex items-center gap-2 font-bold text-ink text-[15px]">
          <HiOutlineShieldCheck size={18} className="text-brand" /> Qanday tekshirilgan
        </p>
        <p className="mt-2">
          Kod yoziladigan topshiriqlar avtomatik testlardan o'tadi. So'ng yechimni amaliyotchi mentor yoki AI talablar, ishlashi, kod sifati va tuzilmasi bo'yicha baholaydi. Bu
          yerda faqat qabul qilingan yechimlar turadi.
        </p>
        {!showWork && <p className="mt-2 text-muted">Muallif kodni yopiq saqlagan — so'rasangiz, o'zi ko'rsatadi.</p>}
      </div>

      {showCta && (
        <Link to="/tasks" className="text-[14px] font-semibold text-brand hover:text-brand-deep">
          O'zingiz ham shunday profil yig'ing — topshiriqlarni bepul sinab ko'ring
        </Link>
      )}
    </>
  );
}

function Stat({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div>
      <dd className="text-[32px] leading-none font-extrabold tracking-[-0.04em] text-ink tabular-nums">{value}</dd>
      <dt className="mt-1.5 text-[13px] text-muted">{label}</dt>
    </div>
  );
}

function ProfileLinksRow({ links }: { links: Profile["links"] }) {
  const items = [
    links.github && {
      href: links.github,
      label: links.github.replace(/^https:\/\/(www\.)?/, ""),
      icon: <FaGithub size={16} />,
    },
    links.linkedin && {
      href: links.linkedin,
      label: "LinkedIn",
      icon: <FaLinkedin size={16} />,
    },
    links.telegram && {
      href: `https://t.me/${links.telegram}`,
      label: `@${links.telegram}`,
      icon: <FaTelegram size={16} />,
    },
  ].filter(Boolean) as { href: string; label: string; icon: React.ReactNode }[];
  if (!items.length) return null;
  return (
    <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2">
      {items.map((l) => (
        <li key={l.href}>
          <a href={l.href} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1.5 text-[14px] font-medium text-ink hover:text-brand">
            {l.icon}
            {l.label}
          </a>
        </li>
      ))}
    </ul>
  );
}

function WorkRow({ item, onOpen, opening }: { item: PublicProfileItem; onOpen: () => void; opening: boolean }) {
  const diff = DIFFICULTY[item.task.difficulty] || DIFFICULTY.oson;
  const allPassed = item.tests && item.tests.passed === item.tests.total;
  return (
    <li className="py-6 border-t border-line first:border-t-0 first:pt-2">
      <div className="flex items-start gap-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-[12px]">
            {item.task.kind && (
              <span className={cx("px-2 py-0.5 rounded-md font-semibold", item.task.kind === "interview" ? "bg-brand-tint text-brand" : "bg-mist text-ink-2")}>
                {KIND_LABEL[item.task.kind]}
              </span>
            )}
            <span className="font-semibold text-ink-2">{item.task.track}</span>
            <span className={`px-2 py-0.5 rounded-md border font-semibold ${diff.className}`}>{diff.label}</span>
          </div>
          <h3 className="mt-2.5 text-[18px] font-bold text-ink leading-snug">{cleanTitle(item.task.title)}</h3>
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted">
            {item.tests && (
              <span className={cx("inline-flex items-center gap-1", allPassed ? "text-emerald-700 dark:text-emerald-400" : "")}>
                <HiOutlineCheckCircle size={15} />
                {item.tests.passed}/{item.tests.total} avtomatik test
              </span>
            )}
            {item.language && item.language !== "sql" && <span>{LANG_LABEL[item.language as CodeLang] || item.language}</span>}
            <span>{item.reviewedBy === "mentor" ? "Mentor tekshirgan" : "AI tekshirgan"}</span>
            <span>{formatDate(item.date)}</span>
          </p>
          {item.review && <blockquote className="mt-3 pl-3 border-l-2 border-line text-[14px] text-ink-2 leading-relaxed">{item.review}</blockquote>}
          {item.strengths.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {item.strengths.map((s) => (
                <li key={s} className="text-[12px] px-2 py-0.5 rounded-md bg-mist text-ink-2">
                  {s}
                </li>
              ))}
            </ul>
          )}
          {(item.canOpen || item.githubUrl || item.liveDemoUrl) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {item.canOpen && (
                <button
                  type="button"
                  onClick={onOpen}
                  disabled={opening}
                  className="h-9 px-4 inline-flex items-center gap-1.5 rounded-full border border-line text-[13px] font-semibold text-ink hover:border-ink cursor-pointer disabled:opacity-60"
                >
                  {item.workType === "design" ? <HiOutlinePhoto size={16} /> : <HiOutlineCodeBracket size={16} />}
                  {opening ? "Ochilmoqda..." : item.workType === "design" ? "Maketlarni ko'rish" : "Kodni ko'rish"}
                </button>
              )}
              {item.githubUrl && (
                <a
                  href={item.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="h-9 px-4 inline-flex items-center gap-1.5 rounded-full border border-line text-[13px] font-semibold text-ink hover:border-ink"
                >
                  <FaGithub size={15} /> GitHub
                </a>
              )}
              {item.liveDemoUrl && (
                <a
                  href={item.liveDemoUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="h-9 px-4 inline-flex items-center gap-1.5 rounded-full border border-line text-[13px] font-semibold text-ink hover:border-ink"
                >
                  <HiOutlineArrowTopRightOnSquare size={15} /> Demo
                </a>
              )}
            </div>
          )}
        </div>
        <div className="shrink-0 text-right" aria-label={`Baho: ${item.score} / 100`}>
          <p className="text-[34px] leading-none font-extrabold tracking-[-0.04em] text-ink tabular-nums">{item.score}</p>
          <p className="mt-1 text-[12px] text-muted">/ 100</p>
        </div>
      </div>
    </li>
  );
}

/** Kod — mentor ko'radigan to'liq ekranli ko'rinishda (testlarni qayta ishga tushirsa bo'ladi); dizayn — rasmlar */
function WorkViewer({ work, onClose }: { work: PublicWork; onClose: () => void }) {
  if (work.code && work.task.sandbox) {
    const submission = {
      _id: work.id,
      code: work.code,
      testResults: work.testResults,
      taskId: { _id: work.task.id, title: work.task.title },
      userId: { _id: "", fullName: work.author },
    } as unknown as Submission;
    return (
      <Suspense fallback={null}>
        <CodeReviewOverlay submission={submission} onClose={onClose} preloadedSandbox={work.task.sandbox} />
      </Suspense>
    );
  }
  return (
    <Modal open onClose={onClose} title={cleanTitle(work.task.title)} size="xl">
      {work.designImages.length ? (
        <ul className="grid sm:grid-cols-2 gap-4">
          {work.designImages.map((im) => (
            <li key={im.url}>
              <a href={mediaUrl(im.url)} target="_blank" rel="noopener noreferrer" className="block rounded-xl overflow-hidden border border-line bg-mist">
                <img src={mediaUrl(im.url)} alt={im.name || "Maket"} loading="lazy" className="w-full h-auto" />
              </a>
              {im.name && <p className="mt-1.5 text-[12px] text-muted truncate">{im.name}</p>}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-ink-2">Ko'rsatiladigan fayl yo'q.</p>
      )}
    </Modal>
  );
}

function ProfileNotFound() {
  return (
    <main className="min-h-[60vh] max-w-6xl mx-auto px-5 sm:px-8 py-24 flex flex-col items-start justify-center">
      <Seo title="Profil topilmadi" noindex />
      <h1 className="text-4xl sm:text-5xl font-extrabold tracking-[-0.04em] text-ink">Profil topilmadi</h1>
      <p className="mt-4 text-lg text-ink-2 max-w-lg">Bunday taxallusli ochiq profil yo'q yoki egasi uni yopib qo'ygan.</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link to="/tasks" className="h-12 px-6 inline-flex items-center rounded-full bg-brand text-white font-semibold hover:bg-brand-deep transition-colors">
          Topshiriqlarni ko'rish
        </Link>
        <Link to="/" className="h-12 px-6 inline-flex items-center rounded-full border border-line text-ink font-semibold hover:border-ink">
          Bosh sahifa
        </Link>
      </div>
    </main>
  );
}
