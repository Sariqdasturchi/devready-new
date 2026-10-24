import { Badge } from "./ui";
import { TASK_KINDS, taskKind, type TaskKind } from "../lib/taskKind";

/** Task turi: "Suhbat topshirig'i" yoki "Ishdagi task". Tur tegi bo'lmasa hech narsa chizmaydi. */
export default function TaskKindTag({ tags, kind, className }: { tags?: string[] | null; kind?: TaskKind | null; className?: string }) {
  const k = kind ?? taskKind(tags);
  if (!k) return null;
  return (
    <Badge tone={k === "interview" ? "info" : "neutral"} className={`font-semibold ${className || ""}`}>
      {TASK_KINDS[k]}
    </Badge>
  );
}
