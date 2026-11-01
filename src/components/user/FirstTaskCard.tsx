import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { taskApi, type RecommendedTask } from "../../api/api";
import { Card } from "../ui";

const formatMinutes = (m?: number) => {
  if (!m) return "";
  if (m < 60) return `${m} daqiqa`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} soat ${r} daq` : `${h} soat`;
};

/**
 * Hali birorta task boshlamagan talaba uchun: "Birinchi taskingiz" — bitta aniq qadam.
 * Voronka: ro'yxatdan o'tganlarning 69% i kabinetni ko'rib, task boshlamay chiqib ketayotgan edi.
 */
export default function FirstTaskCard() {
  const [task, setTask] = useState<RecommendedTask | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    let alive = true;
    taskApi
      .recommended()
      .then((t) => {
        if (!alive) return;
        setTask(t);
        setShow(Boolean(t));
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  if (!show || !task) return null;
  return (
    <Card className="p-5 sm:p-6 border-brand/40 bg-brand-tint/40">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-brand">Shu yerdan boshlang</p>
          <p className="mt-1 text-[18px] font-bold text-ink leading-snug">{task.title}</p>
          <p className="mt-1.5 text-[14px] text-ink-2 leading-relaxed line-clamp-2">{task.description}</p>
          <p className="mt-2 text-[13px] text-muted">
            {task.difficulty === "oson" ? "Oson" : task.difficulty === "orta" ? "O'rta" : "Qiyin"}
            {task.estimatedTime ? ` · ${formatMinutes(task.estimatedTime)}` : ""} · {task.xp} XP · hech narsa o'rnatish shart emas
          </p>
        </div>
        <Link
          to={`/dashboard/tasks/${task._id}`}
          className="shrink-0 h-11 px-6 rounded-full bg-brand hover:bg-brand-deep text-white text-[15px] font-semibold inline-flex items-center justify-center"
        >
          Taskni boshlash
        </Link>
      </div>
    </Card>
  );
}
