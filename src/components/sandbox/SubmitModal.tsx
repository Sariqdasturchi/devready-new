import { useEffect, useState } from "react";
import { HiOutlineExclamationTriangle } from "react-icons/hi2";
import { errorCode, errorMessage, mentorApi, submissionApi } from "../../api/api";
import type { Mentor, SandboxCode, UserTask } from "../../types/type";
import { Alert, Button, Field, Modal, PageLoader, Textarea, cx } from "../ui";
import { useToast } from "../ui/toast";
import { MentorSelector } from "../user/MentorSelector";

/** Kod muhitidagi yechimni mentor yoki AI tekshiruviga yuborish */
export default function SubmitModal({
  open,
  onClose,
  task,
  code,
  passed,
  total,
  tested,
  onSubmitted,
  onExpired,
}: {
  open: boolean;
  onClose: () => void;
  task: UserTask;
  code: SandboxCode;
  passed: number;
  total: number;
  tested: boolean;
  onSubmitted: () => void;
  onExpired: () => void;
}) {
  const toast = useToast();
  // Musobaqa urinishi: yechimni AI avtomatik tekshiradi, mentor tanlanmaydi
  const contest = !!task.contestId;
  const [method, setMethod] = useState<"mentor" | "ai">("mentor");
  const [mentorId, setMentorId] = useState("");
  const [mentors, setMentors] = useState<Mentor[] | null>(null);
  const [mentorsError, setMentorsError] = useState("");
  const [aiAvailable, setAiAvailable] = useState(true);
  const [notes, setNotes] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open || mentors || contest) return;
    submissionApi
      .aiStatus()
      .then((r) => {
        setAiAvailable(r.available);
        if (!r.available) setMethod("mentor");
      })
      .catch(() => undefined);
    mentorApi
      .list(task.track)
      .then((list) => {
        setMentors(list);
        setMentorsError("");
      })
      .catch((e) => {
        setMentors([]);
        setMentorsError(errorMessage(e, "Mentorlar ro'yxatini yuklab bo'lmadi"));
      });
  }, [open, mentors, task.track, contest]);

  const submit = async () => {
    if (!task.submissionId) return;
    if (!contest && method === "mentor" && !mentorId) return toast.error("Tekshiruvchi mentorni tanlang");
    setSending(true);
    try {
      await submissionApi.submit(task.submissionId, {
        code,
        testResults: tested ? { passed, total } : undefined,
        notes: notes.trim() || undefined,
        reviewMethod: contest ? "ai" : method,
        mentorId: !contest && method === "mentor" ? mentorId : undefined,
      });
      toast.success(contest ? "Yechim musobaqaga qabul qilindi" : method === "mentor" ? "Yechim mentorga yuborildi" : "AI tekshiruvi boshlandi");
      onSubmitted();
    } catch (err) {
      toast.error(errorMessage(err));
      if (errorCode(err) === "DEADLINE_OVER") onExpired();
    } finally {
      setSending(false);
    }
  };

  const allPassed = tested && passed === total;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={contest ? "Musobaqaga yuborish" : "Yechimni yuborish"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button onClick={submit} loading={sending}>
            {contest ? "Yakuniy yechimni yuborish" : "Tekshirishga yuborish"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {!tested ? (
          <Alert tone="warning">Testlar hali ishga tushirilmagan. Yuborishdan oldin "Tekshirish" tugmasini bosib ko'ring — natija tekshiruvchiga ham ko'rinadi.</Alert>
        ) : allPassed ? (
          <Alert tone="success">Barcha {total} ta test o'tdi. Yechimingiz tekshiruvchiga kod va natija bilan birga boradi.</Alert>
        ) : (
          <div className="flex gap-2.5 rounded-xl bg-amber-50 p-3.5 text-[13px] text-amber-800">
            <HiOutlineExclamationTriangle size={18} className="shrink-0 mt-0.5" />
            <p>
              {total} ta testdan {passed} tasi o'tdi. Yuborishingiz mumkin, lekin o'tmagan testlar bahoga ta'sir qiladi.
            </p>
          </div>
        )}

        {contest && (
          <p className="text-[13px] text-ink-2 leading-relaxed">
            Musobaqada bitta urinish bor: yuborgandan keyin kodni o'zgartirib bo'lmaydi. Reytingdagi o'rin testlar soni va sarflangan vaqt bo'yicha aniqlanadi, yechimni AI
            tekshiradi.
          </p>
        )}

        {!contest && (
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-ink-2">Kim tekshirsin?</span>
            <div className="grid grid-cols-2 gap-2">
              {(["mentor", "ai"] as const).map((m) => {
                const off = m === "ai" && !aiAvailable;
                return (
                  <button
                    key={m}
                    type="button"
                    disabled={off}
                    onClick={() => setMethod(m)}
                    className={cx(
                      "p-3 rounded-xl border text-left",
                      off ? "border-line opacity-50 cursor-not-allowed" : "cursor-pointer",
                      method === m ? "border-brand bg-brand-tint" : !off && "border-line hover:border-ink-2",
                    )}
                  >
                    <span className="block text-sm font-semibold text-ink">{m === "mentor" ? "Mentor" : "AI"}</span>
                    <span className="block text-[11px] text-muted">{m === "mentor" ? "Batafsil code review" : off ? "Hozircha mavjud emas" : "Bir necha daqiqada natija"}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {!contest &&
          method === "mentor" &&
          (mentors === null ? (
            <PageLoader label="Mentorlar..." />
          ) : mentorsError ? (
            <Alert tone="danger">{mentorsError}</Alert>
          ) : (
            <MentorSelector mentors={mentors} selectedId={mentorId} onSelect={setMentorId} />
          ))}

        <Field label="Izoh (ixtiyoriy)">
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Tekshiruvchi uchun qo'shimcha ma'lumot..." className="min-h-[70px]" />
        </Field>
      </div>
    </Modal>
  );
}
