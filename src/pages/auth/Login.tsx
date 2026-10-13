import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { PatternFormat } from "react-number-format";
import { authApi, errorCode, errorMessage } from "../../api/api";
import { homeForRole, setSession } from "../../lib/auth";
import AuthShell, { AuthMessage } from "../../components/auth/AuthShell";
import OtpInput from "../../components/auth/OtpInput";
import { BOT_USERNAME } from "../../lib/constants";

const RESEND_SECONDS = 60;

export default function Login() {
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from;
  const [step, setStep] = useState<1 | 2>(1);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; tone: "error" | "success" }>({ text: "", tone: "error" });
  const [notRegistered, setNotRegistered] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const fullPhone = `+998${phone}`;

  const requestCode = async () => {
    setMsg({ text: "", tone: "error" });
    setNotRegistered(false);
    setLoading(true);
    try {
      await authApi.login({ phone: fullPhone });
      setStep(2);
      setCode("");
      setResendIn(RESEND_SECONDS);
      setMsg({ text: `Kod @${BOT_USERNAME} botiga yuborildi`, tone: "success" });
    } catch (err) {
      setNotRegistered(errorCode(err) === "NOT_REGISTERED");
      setMsg({ text: errorMessage(err), tone: "error" });
    } finally {
      setLoading(false);
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      if (phone.length < 9) return setMsg({ text: "Telefon raqamni to'liq kiriting", tone: "error" });
      return requestCode();
    }
    if (code.length < 6) return setMsg({ text: "6 xonali kodni to'liq kiriting", tone: "error" });
    setLoading(true);
    setMsg({ text: "", tone: "error" });
    try {
      const res = await authApi.loginVerify({ phone: fullPhone, code });
      setSession(res.token, res.user);
      // Himoyalangan sahifadan kelgan bo'lsa (va u shu rolga tegishli bo'lsa) — o'sha yerga qaytaramiz
      const home = homeForRole(res.user.role);
      navigate(from && from.startsWith(home) ? from : home, { replace: true });
    } catch (err) {
      setCode("");
      setMsg({ text: errorMessage(err), tone: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <form onSubmit={submit} className="flex flex-col gap-6">
        <div>
          <h1 className="text-[32px] font-extrabold tracking-[-0.035em] leading-tight text-ink">{step === 1 ? "Tizimga kirish" : "Kodni kiriting"}</h1>
          <p className="text-[15px] text-ink-2 mt-2 leading-relaxed">
            {step === 1 ? "Telefon raqamingizni kiriting — kod Telegram botga keladi" : `+998 ${phone} raqamiga bog'langan Telegramga kod yuborildi`}
          </p>
        </div>

        <AuthMessage {...msg} />
        {notRegistered && (
          <Link to="/register" className="-mt-3 text-[15px] font-semibold text-brand hover:underline">
            Ro'yxatdan o'tish →
          </Link>
        )}

        {step === 1 ? (
          <label className="flex flex-col gap-2">
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
                autoFocus
                inputMode="tel"
              />
            </div>
          </label>
        ) : (
          <div className="flex flex-col gap-3">
            <OtpInput value={code} onChange={setCode} disabled={loading} />
            <div className="flex items-center justify-between text-[14px]">
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setMsg({ text: "", tone: "error" });
                }}
                className="text-muted hover:text-ink cursor-pointer"
              >
                ← Raqamni o'zgartirish
              </button>
              <button
                type="button"
                disabled={resendIn > 0 || loading}
                onClick={requestCode}
                className="font-semibold text-brand disabled:text-muted cursor-pointer disabled:cursor-default"
              >
                {resendIn > 0 ? `Qayta yuborish (${resendIn})` : "Kodni qayta yuborish"}
              </button>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full h-12 bg-brand hover:bg-brand-deep text-white font-semibold rounded-full flex items-center justify-center gap-2 text-[15px] cursor-pointer transition-colors disabled:opacity-50"
        >
          <span>{loading ? "Yuklanmoqda..." : step === 1 ? "Kod olish" : "Kirish"}</span>
          
        </button>

        {step === 1 && (
          <p className="text-[15px] text-muted">
            Akkauntingiz yo'qmi?{" "}
            <Link to="/register" className="text-ink font-semibold underline underline-offset-4 hover:text-brand">
              Ro'yxatdan o'tish
            </Link>
          </p>
        )}
      </form>
    </AuthShell>
  );
}
