import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { HiOutlineClock, HiOutlineCodeBracket, HiOutlinePaintBrush, HiOutlineArrowTopRightOnSquare } from "react-icons/hi2";
import { errorMessage, taskApi } from "../../api/api";
import type { Task } from "../../types/type";
import { DIFFICULTY, TRACKS } from "../../lib/constants";
import { formatDuration } from "../../lib/format";
import { setTryReturn, track, trackVisit } from "../../lib/track";
import { stackLabel } from "../../components/sandbox/kinds";
import { ErrorState, Modal, PageLoader, cx } from "../../components/ui";
import Seo from "../../components/Seo";
import { TaskRequirements, TaskText } from "../../components/TaskText";
import TaskKindTag from "../../components/TaskKindTag";

/**
 * Ochiq tasklar katalogi: ro'yxatdan o'tmasdan ko'rish va kod yoziladigan tasklarni brauzerda sinab ko'rish.
 * Ro'yxatdan o'tish faqat yechimni tekshiruvga yuborishda so'raladi.
 */
export default function PublicTasks() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<Task | null>(null);
  const active = params.get("track") || "";

  useEffect(() => {
    trackVisit();
    track("catalog_view");
    taskApi
      .publicList()
      .then(setTasks)
      .catch((e) => setError(errorMessage(e, "Tasklarni yuklab bo'lmadi")));
  }, []);

  // Batafsil oynasi: ?open=<id> (masalan, dizayn tasklari sinov sahifasidan qaytganda)
  useEffect(() => {
    const id = params.get("open");
    if (id && tasks) setOpen(tasks.find((t) => t._id === id) || null);
  }, [params, tasks]);

  const tracks = useMemo(() => TRACKS.filter((t) => tasks?.some((x) => x.track === t)), [tasks]);
  const visible = useMemo(() => (tasks || []).filter((t) => !active || t.track === active), [tasks, active]);

  const setTrack = (t: string) => {
    const next = new URLSearchParams(params);
    if (t) next.set("track", t);
    else next.delete("track");
    next.delete("open");
    setParams(next, { replace: true });
  };

  const startWithAccount = (t: Task) => {
    setTryReturn(t._id, t.track);
    navigate("/register");
  };

  return (
    <main>
      <Seo
        title="Amaliy tasklar — ro'yxatdan o'tmasdan sinab ko'ring"
        description="Frontend, Backend (JavaScript, TypeScript, Python), SQL, DevOps, QA va dizayn bo'yicha amaliy tasklar. Kod brauzerda ishlaydi va avtomatik testlanadi — hech narsa o'rnatish shart emas."
      />
      <section className="max-w-6xl mx-auto px-5 sm:px-8 pt-14 sm:pt-20 pb-10">
        <h1 className="text-[40px] sm:text-6xl font-extrabold tracking-[-0.045em] leading-[1.03] text-ink max-w-3xl text-balance">
          Ro'yxatdan o'tmasdan sinab ko'ring.
        </h1>
        <p className="mt-5 text-lg text-ink-2 max-w-2xl leading-relaxed">
          Taskni oching, kod yozing va testlarni ishga tushiring — hammasi brauzerda, hech narsa o'rnatish shart emas. Natija yoqsa, ro'yxatdan o'tib yechimni mentor yoki AI
          tekshiruviga yuborasiz.
        </p>
      </section>

      <section className="max-w-6xl mx-auto px-5 sm:px-8 pb-24">
        <div className="flex flex-wrap gap-2 mb-8" role="tablist" aria-label="Yo'nalish">
          {["", ...tracks].map((t) => (
            <button
              key={t || "all"}
              type="button"
              role="tab"
              aria-selected={active === t}
              onClick={() => setTrack(t)}
              className={cx(
                "h-10 px-4 rounded-full text-[15px] font-medium cursor-pointer border transition-colors",
                active === t ? "bg-ink text-paper border-ink" : "bg-surface text-ink border-line hover:border-ink",
              )}
            >
              {t || "Hammasi"}
            </button>
          ))}
        </div>

        {error ? (
          <ErrorState message={error} />
        ) : !tasks ? (
          <PageLoader />
        ) : (
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visible.map((t) => {
              const diff = DIFFICULTY[t.difficulty] || DIFFICULTY.oson;
              const code = !!t.sandbox?.enabled;
              return (
                <li key={t._id} className="flex flex-col rounded-2xl border border-line bg-surface p-5">
                  <div className="flex flex-wrap items-center gap-2 text-[12px]">
                    <TaskKindTag tags={t.tags} />
                    <span className="font-semibold text-ink-2">{t.track}</span>
                    <span className={`px-2 py-0.5 rounded-md border font-semibold ${diff.className}`}>{diff.label}</span>
                    <span className="ml-auto text-muted">{t.xp} XP</span>
                  </div>
                  <h2 className="mt-3 text-[17px] font-bold text-ink leading-snug">{t.title}</h2>
                  <p className="mt-2 text-[14px] text-ink-2 leading-relaxed line-clamp-3">{t.description}</p>
                  <p className="mt-3 flex items-center gap-1.5 text-[12px] text-muted">
                    {code ? <HiOutlineCodeBracket size={14} /> : t.deliverable === "design" ? <HiOutlinePaintBrush size={14} /> : <HiOutlineArrowTopRightOnSquare size={14} />}
                    {code ? stackLabel(t.sandbox) : t.deliverable === "design" ? "Figma + maket rasmlari" : "GitHub repozitoriy"}
                    <span className="mx-1">·</span>
                    <HiOutlineClock size={14} /> {formatDuration(t.estimatedTime)}
                  </p>
                  <div className="mt-5 pt-4 border-t border-line flex gap-2">
                    {code ? (
                      <Link
                        to={`/try/${t._id}`}
                        className="h-10 px-4 flex-1 inline-flex items-center justify-center rounded-full bg-brand text-white text-sm font-semibold hover:bg-brand-deep transition-colors"
                      >
                        Sinab ko'rish
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setOpen(t)}
                        className="h-10 px-4 flex-1 inline-flex items-center justify-center rounded-full border border-line text-sm font-semibold text-ink hover:border-ink cursor-pointer"
                      >
                        Shartlarni ko'rish
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {open && (
        <Modal
          open
          onClose={() => setOpen(null)}
          title={open.title}
          footer={
            <button
              type="button"
              onClick={() => startWithAccount(open)}
              className="h-11 px-6 rounded-full bg-brand text-white text-sm font-semibold hover:bg-brand-deep cursor-pointer"
            >
              Ro'yxatdan o'tib bajarish
            </button>
          }
        >
          <TaskBriefView id={open._id} fallback={open} />
        </Modal>
      )}
    </main>
  );
}

/** Dizayn/repo tasklari uchun to'liq shartlar */
function TaskBriefView({ id, fallback }: { id: string; fallback: Task }) {
  const [task, setTask] = useState<Task>(fallback);
  useEffect(() => {
    taskApi
      .publicGet(id)
      .then(setTask)
      .catch(() => undefined);
  }, [id]);
  return (
    <div className="flex flex-col gap-4 text-[14px] text-ink-2 leading-relaxed">
      <TaskText description={task.description} content={task.content} />
      <TaskRequirements items={task.requirements} className="pt-4 border-t border-line" />
      <p className="text-[13px] text-muted">
        {task.deliverable === "design"
          ? "Dizaynni Figma'da chizasiz va maket rasmlarini yuklaysiz — AI yoki mentor baholaydi."
          : "Yechimni GitHub'ga yuklaysiz — AI yoki mentor baholaydi."}
      </p>
    </div>
  );
}
