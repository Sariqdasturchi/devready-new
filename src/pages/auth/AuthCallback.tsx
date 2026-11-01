import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi, errorMessage } from "../../api/api";
import { homeForRole, setSession } from "../../lib/auth";
import AuthShell, { AuthMessage } from "../../components/auth/AuthShell";
import { clearTryReturn, readTryReturn, takeReturnPath } from "../../lib/track";

const ERRORS: Record<string, string> = {
  cancelled: "Kirish bekor qilindi. Qaytadan urinib ko'ring yoki telefon raqam bilan kiring.",
  state: "Kirish sahifasi eskirgan yoki boshqa brauzerda ochilgan. Qaytadan urinib ko'ring.",
  provider: "Google/GitHub bilan bog'lanib bo'lmadi. Bir ozdan keyin qayta urinib ko'ring.",
  blocked: "Hisobingiz bloklangan. Administrator bilan bog'laning: @devreadyadmin",
  disabled: "Bu kirish usuli hozircha yoqilmagan. Telefon raqam orqali kiring.",
  server: "Serverda xatolik yuz berdi. Qaytadan urinib ko'ring.",
};

/**
 * /auth/callback#code=... — Google/GitHub'dan qaytish.
 * Bir martalik kod sessiyaga almashtiriladi; yangi foydalanuvchi yo'nalish tanlashga, qolganlar kabinetga o'tadi.
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const hash = new URLSearchParams(window.location.hash.slice(1));
    // Kodni manzil satridan darhol olib tashlaymiz (tarix va skrinshotlarda qolmasin)
    window.history.replaceState(null, "", window.location.pathname);
    const err = hash.get("error");
    const code = hash.get("code");
    if (err || !code) {
      setError(ERRORS[err || ""] || ERRORS.server);
      return;
    }
    authApi
      .oauthExchange(code)
      .then((r) => {
        setSession(r.token, r.user);
        if (r.user.role !== "user") return navigate(homeForRole(r.user.role), { replace: true });
        // Yangi talaba: avval yo'nalish va daraja testi (sinab ko'rgan taski bo'lsa ham — yo'nalishsiz task ochilmaydi)
        if (!r.user.direction) return navigate("/register?step=direction", { replace: true });
        const tried = readTryReturn();
        clearTryReturn();
        const back = takeReturnPath();
        navigate(tried ? `/dashboard/tasks/${tried.taskId}` : r.returnTo || back || "/dashboard", { replace: true });
      })
      .catch((e) => setError(errorMessage(e)));
  }, [navigate]);

  return (
    <AuthShell>
      {error ? (
        <div className="flex flex-col gap-5">
          <h1 className="text-[32px] font-extrabold tracking-[-0.035em] leading-tight text-ink">Kirib bo'lmadi</h1>
          <AuthMessage text={error} tone="error" />
          <div className="flex gap-3">
            <Link to="/login" className="h-12 px-6 rounded-full bg-brand hover:bg-brand-deep text-white font-semibold inline-flex items-center text-[15px]">
              Qaytadan urinish
            </Link>
            <Link to="/register" className="h-12 px-6 rounded-full border border-line hover:border-ink text-ink font-semibold inline-flex items-center text-[15px]">
              Ro'yxatdan o'tish
            </Link>
          </div>
        </div>
      ) : (
        <p className="flex items-center gap-2.5 text-[15px] text-ink-2" role="status">
          <span className="w-4 h-4 rounded-full border-2 border-brand/30 border-t-brand animate-spin shrink-0" />
          Kirilmoqda...
        </p>
      )}
    </AuthShell>
  );
}
