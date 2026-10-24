/** Task turi teglardan: "Suhbat topshirig'i" yoki "Ishdagi task" (sarlavhada prefiks yo'q) */
export const TASK_KINDS = { interview: "Suhbat topshirig'i", job: "Ishdagi task" } as const;
export type TaskKind = keyof typeof TASK_KINDS;

export function taskKind(tags?: string[] | null): TaskKind | null {
  if (!tags) return null;
  if (tags.includes(TASK_KINDS.interview)) return "interview";
  if (tags.includes(TASK_KINDS.job)) return "job";
  return null;
}

/** Ko'rsatiladigan teglar: tur tegi alohida belgi bo'lib chiqadi */
export const visibleTags = (tags?: string[] | null) => (tags || []).filter((t) => t !== TASK_KINDS.interview && t !== TASK_KINDS.job);
