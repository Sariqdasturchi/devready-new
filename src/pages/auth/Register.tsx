import { useEffect, useState, type FormEvent } from "react";
import { FiExternalLink } from "react-icons/fi";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { PatternFormat } from "react-number-format";
import { authApi, errorCode, errorMessage, quizApi } from "../../api/api";
import { setSession, updateStoredUser } from "../../lib/auth";
import { BOT_USERNAME, TRACKS } from "../../lib/constants";
import AuthShell, { AuthMessage } from "../../components/auth/AuthShell";
import OtpInput from "../../components/auth/OtpInput";
import { anonId, clearTryReturn, readTryReturn, source, track, trackVisit } from "../../lib/track";

type Step = 1 | 2 | 3 | 4 | 5;
type Q = { _id: string; q: string; options: string[]; correct: number };

const STEPS = ["Ma'lumotlar", "Telegram", "Tasdiqlash", "Yo'nalish", "Test"];
const RESEND_SECONDS = 60;

function levelFor(score: number, total: number) {
  if (!total) return "Beginner";
  const ratio = score / total;
  if (ratio >= 0.8) return "Strong Junior";
  if (ratio >= 0.5) return "Junior";
  return "Beginner";
}

export default function Register() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [telegramId, setTelegramId] = useState("");
  const [code, setCode] = useState("");
  const [direction, setDirection] = useState("");
  const [questions, setQuestions] = useState<Q[]>([]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; tone: "error" | "success" }>({ text: "", tone: "error" });
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [params] = useSearchParams();
  // Bir bosishda Telegram tasdiqlash: token + holat
  const [linkToken, setLinkToken] = useState<string | null>(params.get("link"));
  const [linkState, setLinkState] = useState<"idle" | "waiting" | "expired">(params.get("link") ? "waiting" : "idle");
  const [manual, setManual] = useState(false);
  const [tried] = useState(readTryReturn);

  useEffect(() => {
    trackVisit();
    track("register_view");
  }, []);

  // Botdan "Saytga qaytish" bosib kelgan bo'lsa — darhol tasdiq holatini tekshiramiz
  useEffect(() => {
    if (params.get("link")) setStep(2);
  }, [params]);

  /** Tasdiqlangach: yo'nalish tanlangan bo'lsa — kabinetga (yoki sinab ko'rilgan taskka), aks holda yo'nalish */
  const afterVerified = (dir?: string | null) => {
    if (dir) finish();
    else setStep(4);
  };
  const finish = () => {
    const t = tried;
    clearTryReturn();
    navigate(t ? `/dashboard/tasks/${t.taskId}` : "/dashboard", { replace: true });
  };

  // Telegram'da tasdiqlanguncha 2.5 soniyada bir so'raymiz
  useEffect(() => {
    if (!linkToken || step !== 2 || manual) return;
    let stop = false;
    const tick = async () => {
      try {
        const r = await authApi.telegramLink(linkToken);
        if (stop) return;
        if (r.status === "linked" && r.token && r.user) {
          setSession(r.token, r.user);
          afterVerified(r.user.direction);
          return;
        }
        if (r.status === "expired") {
          setLinkState("expired");
          return;
        }
        if (r.error) setMsg({ text: r.error, tone: "error" });
      } catch {
        /* tarmoq xatosi — keyingi urinishda */
      }
      if (!stop) timer = setTimeout(tick, 2500);
    };
    let timer = setTimeout(tick, 1200);
    return () => {
      stop = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkToken, step, manual]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const fullPhone = `+998${phone}`;
  const fail = (err: unknown) => {
    setAlreadyRegistered(errorCode(err) === "ALREADY_REGISTERED");
    setMsg({ text: errorMessage(err), tone: "error" });
  };
  const clear = () => {
    setMsg({ text: "", tone: "error" });
    setAlreadyRegistered(false);
  };

  const submitInfo = async (e: FormEvent) => {
    e.preventDefault();
    clear();
    if (fullName.trim().length < 3) return setMsg({ text: "Ism va familiyangizni to'liq kiriting", tone: "error" });
    if (phone.length < 9) return setMsg({ text: "Telefon raqamni to'liq kiriting", tone: "error" });
    setLoading(true);
    try {
      const r = await authApi.register({ fullName: fullName.trim(), phone: fullPhone, anonId: anonId(), source: source() });
      track("register_info");
      setLinkToken(r.linkToken || null);
      setLinkState("idle");
      setManual(!r.linkToken);
      setStep(2);
    } catch (err) {
      fail(err);
    } finally {
      setLoading(false);
    }
  };

  const sendCode = async (e?: FormEvent) => {
    e?.preventDefault();
    clear();
    if (!/^\d{5,15}$/.test(telegramId.trim())) return setMsg({ text: "Telegram ID faqat raqamlardan iborat bo'ladi", tone: "error" });
    setLoading(true);
    try {
      await authApi.sendOtp({ phone: fullPhone, telegramId: telegramId.trim() });
      track("register_manual");
      setStep(3);
      setCode("");
      setResendIn(RESEND_SECONDS);
      setMsg({ text: `6 xonali kod @${BOT_USERNAME} botiga yuborildi`, tone: "success" });
    } catch (err) {
      fail(err);
    } finally {
      setLoading(false);
    }
  };

  const verify = async (e: FormEvent) => {
    e.preventDefault();
    clear();
    if (code.length < 6) return setMsg({ text: "6 xonali kodni to'liq kiriting", tone: "error" });
    setLoading(true);
    try {
      const res = await authApi.verifyOtp({ phone: fullPhone, code });
      setSession(res.token, res.user);
      afterVerified(res.user.direction);
    } catch (err) {
      setCode("");
      fail(err);
    } finally {
      setLoading(false);
    }
  };

  const openTelegram = () => {
    track("register_tg_open");
    setLinkState("waiting");
    clear();
  };

  const skipQuiz = async () => {
    track("quiz_skip");
    setLoading(true);
    try {
      await saveResult(direction, "Beginner");
    } catch (err) {
      fail(err);
    } finally {
      setLoading(false);
    }
  };

  const saveResult = async (dir: string, level: string) => {
    const user = await quizApi.saveResult({ direction: dir, level });
    updateStoredUser(user);
    setResult(level);
  };

  const chooseDirection = async (dir: string) => {
    clear();
    setDirection(dir);
    setLoading(true);
    try {
      const list = await quizApi.questions(dir);
      if (list.length) {
        setQuestions(list);
        setIndex(0);
        setScore(0);
        setStep(5);
      } else {
        // Bu yo'nalish uchun test hali qo'shilmagan — boshlang'ich daraja bilan davom etamiz
        await saveResult(dir, "Beginner");
      }
    } catch (err) {
      fail(err);
    } finally {
      setLoading(false);
    }
  };

  const answer = async (option: number) => {
    const nextScore = score + (option === questions[index].correct ? 1 : 0);
    setScore(nextScore);
    if (index < questions.length - 1) return setIndex(index + 1);
    setLoading(true);
    try {
      await saveResult(direction, levelFor(nextScore, questions.length));
    } catch (err) {
      fail(err);
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <AuthShell>
        <div className="flex flex-col items-start gap-5">
          {questions.length > 0 && (
            <div className="text-[56px] font-extrabold tracking-[-0.05em] leading-none text-ink tabular-nums">
              {score}/{questions.length}
            </div>
          )}
          <div>
            <h1 className="text-[32px] font-extrabold tracking-[-0.035em] leading-tight text-ink">Xush kelibsiz!</h1>
            <p className="text-[15px] text-ink-2 mt-2 leading-relaxed">Yo'nalish: {direction}. Boshlang'ich darajangiz:</p>
          </div>
          <div className="h-10 px-5 inline-flex items-center rounded-full bg-brand text-white font-semibold">
            {result}
          </div>
          <p className="text-[15px] text-ink-2 leading-relaxed">
            {tried
              ? "Sinab ko'rgan taskingiz ochiladi — yozgan kodingiz o'z joyida. Free tarifda 10 ta task bajarishingiz mumkin."
              : "Vazifalar yo'nalishingiz bo'yicha taqdim etiladi. Free tarifda 10 ta task bajarishingiz mumkin."}
          </p>
          <button
            type="button"
            onClick={finish}
            className="w-full h-12 bg-brand hover:bg-brand-deep text-white font-semibold rounded-full flex items-center justify-center gap-2 text-[15px] cursor-pointer transition-colors disabled:opacity-50"
          >
            {tried ? "Taskni davom ettirish" : "Kabinetga o'tish"} 
          </button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell wide>
      <div className="flex items-center gap-1.5 mb-3" aria-hidden>
        {STEPS.map((label, i) => (
          <div key={label} className={`h-1 flex-1 rounded-full ${step >= i + 1 ? "bg-brand" : "bg-line"}`} />
        ))}
      </div>

      <p className="text-[14px] text-muted mb-8">
        {step}-qadam, {STEPS.length} tadan: {STEPS[step - 1]}
      </p>

      <AuthMessage {...msg} />
      {alreadyRegistered && (
        <Link to="/login" className="block -mt-3 mb-4 text-[15px] font-semibold text-brand hover:underline">
          Kirish sahifasiga o'tish →
        </Link>
      )}

      {step === 1 && (
        <form onSubmit={submitInfo} className="flex flex-col gap-5">
          <div>
            <h1 className="text-[32px] font-extrabold tracking-[-0.035em] leading-tight text-ink">Hisob yarating</h1>
            <p className="text-[15px] text-ink-2 mt-2 leading-relaxed">Amaliy tasklar orqali real loyihalarga tayyorlaning</p>
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink">Ism va familiya</span>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ali Valiyev"
              autoFocus
              className="w-full h-12 px-4 bg-surface border border-line rounded-xl text-[16px] text-ink focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 placeholder:text-muted/60"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink">Telefon raqam</span>
            <div className="flex border border-line rounded-xl overflow-hidden focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/10 bg-surface">
              <span className="bg-mist px-4 text-[15px] text-ink-2 border-r border-line flex items-center">+998</span>
              <PatternFormat
                format="(##) ###-##-##"
                mask="_"
                value={phone}
                onValueChange={(v) => setPhone(v.value)}
                className="w-full h-12 px-4 text-[16px] text-ink focus:outline-none bg-transparent placeholder:text-muted/60 tabular-nums tracking-wide"
                placeholder="(__) ___-__-__"
                inputMode="tel"
              />
            </div>
          </label>
          <button type="submit" disabled={loading} className="w-full h-12 bg-brand hover:bg-brand-deep text-white font-semibold rounded-full flex items-center justify-center gap-2 text-[15px] cursor-pointer transition-colors disabled:opacity-50">
            {loading ? "Yuklanmoqda..." : "Keyingi qadam"} 
          </button>
          <p className="text-[15px] text-muted">
            Hisobingiz bormi?{" "}
            <Link to="/login" className="text-ink font-semibold underline underline-offset-4 hover:text-brand">
              Kirish
            </Link>
          </p>
        </form>
      )}

      {step === 2 && !manual && (
        <div className="flex flex-col gap-5">
          <div>
            <h1 className="text-[32px] font-extrabold tracking-[-0.035em] leading-tight text-ink">Telegram orqali tasdiqlang</h1>
            <p className="text-[15px] text-ink-2 mt-2 leading-relaxed">
              Tugmani bosing, Telegram'da <strong className="text-ink">Start</strong> ni bosing va shu sahifaga qayting — u o'zi davom etadi.
            </p>
          </div>
          {linkState === "expired" ? (
            <div className="rounded-2xl bg-mist p-5 text-[15px] text-ink-2 leading-relaxed">
              Havola eskirgan yoki allaqachon ishlatilgan. Agar Telegram'da "tasdiqlandi" degan xabar kelgan bo'lsa —{" "}
              <Link to="/login" className="font-semibold text-brand hover:underline">
                kirish sahifasidan kiring
              </Link>
              . Aks holda{" "}
              <button type="button" onClick={() => setStep(1)} className="font-semibold text-brand hover:underline cursor-pointer">
                qaytadan boshlang
              </button>
              .
            </div>
          ) : (
            <>
              <a
                href={`https://t.me/${BOT_USERNAME}?start=reg_${linkToken}`}
                target="_blank"
                rel="noreferrer"
                onClick={openTelegram}
                className="w-full h-12 bg-brand hover:bg-brand-deep text-white font-semibold rounded-full flex items-center justify-center gap-2 text-[15px] transition-colors"
              >
                Telegram'ni ochish <FiExternalLink size={15} />
              </a>
              {linkState === "waiting" && (
                <p className="flex items-center gap-2.5 text-[15px] text-ink-2" role="status">
                  <span className="w-4 h-4 rounded-full border-2 border-brand/30 border-t-brand animate-spin shrink-0" />
                  Telegram'dan tasdiq kutilmoqda...
                </p>
              )}
            </>
          )}
          <div className="flex items-center justify-between gap-3 text-[14px]">
            <button type="button" onClick={() => setStep(1)} className="text-muted hover:text-ink cursor-pointer">
              ← Orqaga
            </button>
            <button type="button" onClick={() => setManual(true)} className="text-muted hover:text-ink underline underline-offset-4 cursor-pointer">
              Telegram ochilmadimi? ID orqali tasdiqlash
            </button>
          </div>
        </div>
      )}

      {step === 2 && manual && (
        <form onSubmit={sendCode} className="flex flex-col gap-5">
          <div>
            <h1 className="text-[32px] font-extrabold tracking-[-0.035em] leading-tight text-ink">Telegram ID orqali tasdiqlash</h1>
            <p className="text-[15px] text-ink-2 mt-2 leading-relaxed">Tasdiqlash kodi shu bot orqali yuboriladi</p>
          </div>
          <div className="rounded-2xl bg-mist p-5 text-[15px] text-ink-2 leading-[1.8]">
            1.{" "}
            <a href={`https://t.me/${BOT_USERNAME}`} target="_blank" rel="noreferrer" className="font-semibold text-brand inline-flex items-center gap-1 hover:underline">
              @{BOT_USERNAME} <FiExternalLink size={12} />
            </a>{" "}
            ga o'ting.
            <br />
            2. Botda <strong className="text-ink">/start</strong> tugmasini bosing.
            <br />
            3. Bot taqdim etgan <strong className="text-ink">ID raqamni</strong> quyida kiriting.
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink">Telegram ID</span>
            <input
              value={telegramId}
              onChange={(e) => setTelegramId(e.target.value.replace(/\D/g, ""))}
              placeholder="Masalan: 584930221"
              inputMode="numeric"
              autoFocus
              className="w-full h-12 px-4 bg-surface border border-line rounded-xl text-[16px] text-ink tabular-nums tracking-wide focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 placeholder:text-muted/60"
            />
          </label>
          <button type="submit" disabled={loading} className="w-full h-12 bg-brand hover:bg-brand-deep text-white font-semibold rounded-full flex items-center justify-center gap-2 text-[15px] cursor-pointer transition-colors disabled:opacity-50">
            {loading ? "Yuborilmoqda..." : "Kod yuborish"}
          </button>
          <button type="button" onClick={() => (linkToken ? setManual(false) : setStep(1))} className="text-[15px] text-muted hover:text-ink cursor-pointer self-start">
            ← Orqaga
          </button>
        </form>
      )}

      {step === 3 && (
        <form onSubmit={verify} className="flex flex-col gap-5">
          <div>
            <h1 className="text-[32px] font-extrabold tracking-[-0.035em] leading-tight text-ink">Kodni tasdiqlang</h1>
            <p className="text-[15px] text-ink-2 mt-2 leading-relaxed">Telegram botga yuborilgan 6 xonali kodni kiriting</p>
          </div>
          <OtpInput value={code} onChange={setCode} disabled={loading} />
          <div className="flex items-center justify-between text-[14px]">
            <button
              type="button"
              onClick={() => {
                setManual(true);
                setStep(2);
              }}
              className="text-muted hover:text-ink cursor-pointer"
            >
              ← Telegram ID ni o'zgartirish
            </button>
            <button type="button" disabled={resendIn > 0 || loading} onClick={() => sendCode()} className="font-semibold text-brand disabled:text-muted cursor-pointer">
              {resendIn > 0 ? `Qayta yuborish (${resendIn})` : "Qayta yuborish"}
            </button>
          </div>
          <button type="submit" disabled={loading} className="w-full h-12 bg-brand hover:bg-brand-deep text-white font-semibold rounded-full flex items-center justify-center gap-2 text-[15px] cursor-pointer transition-colors disabled:opacity-50">
            {loading ? "Tekshirilmoqda..." : "Tasdiqlash"} 
          </button>
        </form>
      )}

      {step === 4 && (
        <div className="flex flex-col gap-5">
          <div>
            <h1 className="text-[32px] font-extrabold tracking-[-0.035em] leading-tight text-ink">Yo'nalishingizni tanlang</h1>
            <p className="text-[15px] text-ink-2 mt-2 leading-relaxed">Tasklar shu yo'nalish bo'yicha beriladi. Keyin sozlamalardan o'zgartirish mumkin.</p>
          </div>
          {tried && (
            <p className="text-[14px] text-ink-2 -mt-2">
              Siz <strong className="text-ink">{tried.track}</strong> taskini sinab ko'rdingiz — shu yo'nalishni tanlasangiz, task darhol ochiladi.
            </p>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {TRACKS.map((t) => (
              <button
                key={t}
                type="button"
                disabled={loading}
                onClick={() => chooseDirection(t)}
                className={`h-12 px-4 rounded-xl border bg-surface hover:border-ink text-[15px] font-medium text-ink text-left cursor-pointer disabled:opacity-50 transition-colors ${
                  tried?.track === t ? "border-brand ring-4 ring-brand/10" : "border-line"
                }`}
              >
                {loading && direction === t ? "Yuklanmoqda..." : t}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 5 && questions[index] && (
        <div className="flex flex-col gap-5">
          <div>
            <span className="text-[14px] text-muted tabular-nums">
              Savol {index + 1} / {questions.length}
            </span>
            <h2 className="text-2xl font-bold tracking-[-0.02em] text-ink mt-2">{questions[index].q}</h2>
          </div>
          <div className="flex flex-col gap-2.5">
            {questions[index].options.map((opt, i) => (
              <button
                key={i}
                type="button"
                disabled={loading}
                onClick={() => answer(i)}
                className="w-full p-4 rounded-xl border border-line bg-surface hover:border-ink text-left text-[15px] text-ink flex items-center gap-3 cursor-pointer disabled:opacity-50 transition-colors"
              >
                <span className="w-7 h-7 rounded-full bg-mist text-[13px] font-semibold text-ink-2 flex items-center justify-center shrink-0">{i + 1}</span>
                {opt}
              </button>
            ))}
          </div>
          <button type="button" disabled={loading} onClick={skipQuiz} className="text-[14px] text-muted hover:text-ink underline underline-offset-4 cursor-pointer self-start disabled:opacity-50">
            Testni o'tkazib yuborish — keyinroq
          </button>
        </div>
      )}
    </AuthShell>
  );
}
