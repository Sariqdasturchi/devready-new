import { useEffect, useState } from "react";
import { HiOutlineArrowsRightLeft, HiOutlineHandThumbDown, HiOutlineHandThumbUp } from "react-icons/hi2";
import { errorMessage, mentorApi, submissionApi } from "../../api/api";
import type { FeedbackWindow, Mentor, Submission } from "../../types/type";
import { formatDate } from "../../lib/format";
import { Alert, Button, Card, Field, PageLoader, Textarea, cx } from "../ui";
import { useToast } from "../ui/toast";
import { MentorSelector } from "./MentorSelector";

/** Mentor tekshirgandan keyin: foydali bo'ldimi (👍/👎) va shikoyat */
export function MentorFeedback({ submission }: { submission: Submission }) {
  const toast = useToast();
  const [w, setW] = useState<FeedbackWindow | null>(null);
  const [writing, setWriting] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    submissionApi
      .feedbackWindow(submission._id)
      .then(setW)
      .catch(() => setW(null));
  }, [submission._id]);

  if (!w || !w.canRate) return null;
  const rating = w.feedback?.rating;
  const complaint = w.feedback?.complaint;

  const rate = async (value: "up" | "down") => {
    try {
      const fb = await submissionApi.rate(submission._id, value);
      setW({ ...w, feedback: fb });
      toast.success("Rahmat! Bahoingiz mentorlar sifatini oshirishga yordam beradi");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const complain = async () => {
    setBusy(true);
    try {
      const fb = await submissionApi.complain(submission._id, text);
      setW({ ...w, feedback: fb, canComplain: false });
      setWriting(false);
      toast.success("Shikoyatingiz yuborildi. Administrator ko'rib chiqadi");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-5 flex flex-col gap-3">
      <p className="text-sm font-bold text-ink">Mentor tekshiruvi foydali bo'ldimi?</p>
      <div className="flex gap-2">
        {(["up", "down"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => rate(v)}
            aria-pressed={rating === v}
            className={cx(
              "flex-1 h-11 rounded-xl border inline-flex items-center justify-center gap-2 text-sm font-medium cursor-pointer transition-colors",
              rating === v
                ? v === "up"
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                  : "border-rose-300 bg-rose-50 text-rose-700"
                : "border-line text-ink-2 hover:border-ink-2",
            )}
          >
            {v === "up" ? <HiOutlineHandThumbUp size={18} /> : <HiOutlineHandThumbDown size={18} />}
            {v === "up" ? "Foydali" : "Foydasiz"}
          </button>
        ))}
      </div>

      {complaint ? (
        <Alert tone={complaint.status === "open" ? "warning" : complaint.status === "accepted" ? "success" : "neutral"}>
          {complaint.status === "open"
            ? "Shikoyatingiz administrator tomonidan ko'rib chiqilmoqda."
            : complaint.status === "accepted"
              ? "Shikoyatingiz qabul qilindi."
              : "Shikoyatingiz ko'rib chiqildi va rad etildi."}
          {complaint.resolution ? ` Izoh: ${complaint.resolution}` : ""}
        </Alert>
      ) : w.canComplain ? (
        writing ? (
          <div className="flex flex-col gap-2">
            <Field label="Nimadan norozisiz?" hint="Masalan: izoh kodimga tegishli emas, baho asossiz past. Administrator mentor izohi bilan solishtiradi.">
              <Textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="Batafsil yozing (kamida 20 belgi)" />
            </Field>
            <div className="flex gap-2">
              <Button size="sm" variant="danger" loading={busy} onClick={complain}>
                Shikoyat yuborish
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setWriting(false)}>
                Bekor qilish
              </Button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setWriting(true)} className="self-start text-[13px] text-muted hover:text-ink underline underline-offset-2 cursor-pointer">
            Tekshiruvdan noroziman{w.complaintUntil ? ` (${formatDate(w.complaintUntil)} gacha)` : ""}
          </button>
        )
      ) : null}
    </Card>
  );
}

/** Mentor belgilangan vaqtda tekshirmasa — boshqa mentorga o'tkazish */
export function ReassignPanel({ submission, track, onDone }: { submission: Submission; track: string; onDone: () => void }) {
  const toast = useToast();
  const [w, setW] = useState<FeedbackWindow | null>(null);
  const [open, setOpen] = useState(false);
  const [mentors, setMentors] = useState<Mentor[] | null>(null);
  const [mentorId, setMentorId] = useState("");
  const [busy, setBusy] = useState(false);
  const currentId = typeof submission.mentorId === "object" && submission.mentorId ? submission.mentorId._id : submission.mentorId;

  useEffect(() => {
    submissionApi
      .feedbackWindow(submission._id)
      .then(setW)
      .catch(() => setW(null));
  }, [submission._id]);

  useEffect(() => {
    if (!open || mentors) return;
    mentorApi
      .list(track)
      .then((list) => setMentors(list.filter((m) => m._id !== currentId)))
      .catch(() => setMentors([]));
  }, [open, mentors, track, currentId]);

  if (!w?.reassignAt) return null;
  const ready = new Date(w.reassignAt) <= new Date();
  if (!ready) {
    return <p className="text-[12px] text-muted">Mentor {formatDate(w.reassignAt, true)} gacha tekshirmasa, yechimni boshqa mentorga o'tkazishingiz mumkin bo'ladi.</p>;
  }

  const go = async () => {
    if (!mentorId) return toast.error("Mentorni tanlang");
    setBusy(true);
    try {
      await submissionApi.reassign(submission._id, mentorId);
      toast.success("Yechim boshqa mentorga o'tkazildi");
      onDone();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-amber-50 p-3.5">
      <p className="text-[13px] text-amber-900">Mentor {w.reassignHours} soat ichida tekshirmadi. Xohlasangiz, yechimni boshqa mentorga o'tkazing.</p>
      {!open ? (
        <Button size="sm" variant="secondary" className="self-start" onClick={() => setOpen(true)}>
          <HiOutlineArrowsRightLeft size={16} /> Boshqa mentorga o'tkazish
        </Button>
      ) : mentors === null ? (
        <PageLoader label="Mentorlar..." />
      ) : mentors.length === 0 ? (
        <p className="text-[13px] text-muted">Hozir bo'sh mentor yo'q. Birozdan keyin qayta urinib ko'ring.</p>
      ) : (
        <>
          <MentorSelector mentors={mentors} selectedId={mentorId} onSelect={setMentorId} />
          <Button size="sm" loading={busy} onClick={go} className="self-start">
            O'tkazish
          </Button>
        </>
      )}
    </div>
  );
}
