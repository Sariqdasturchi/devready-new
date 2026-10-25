import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { errorMessage, orgApi } from "../../api/api";
import { invalidateCache } from "../../hooks/useCachedQuery";
import { getStoredUser, getToken, logout } from "../../lib/auth";
import { setReturnPath } from "../../lib/track";
import type { JoinPreview } from "../../types/type";
import Seo from "../../components/Seo";
import { Alert, Button, Spinner } from "../../components/ui";
import { useToast } from "../../components/ui/toast";

const REASON: Record<string, string> = {
  ORG_INACTIVE: "Markazning DevReady obunasi hozir faol emas. O'qituvchingizga xabar bering.",
  INVITE_CLOSED: "O'qituvchi guruhga qo'shilishni vaqtincha yopgan. Unga yozing — havolani qayta ochadi.",
};

/** Taklif havolasi: devready.uz/join/<kod> — talaba ro'yxatdan o'tib (yoki kirib) guruhga qo'shiladi */
export default function Join() {
  const { code = "" } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [data, setData] = useState<JoinPreview | null>(null);
  const [error, setError] = useState("");
  const [joining, setJoining] = useState(false);
  const user = getToken() ? getStoredUser() : null;
  const autoTried = useRef(false);

  useEffect(() => {
    orgApi
      .joinPreview(code)
      .then(setData)
      .catch((e) => setError(errorMessage(e, "Taklif havolasi topilmadi")));
  }, [code]);

  const join = async () => {
    setJoining(true);
    try {
      const r = await orgApi.join(code);
      toast.success(r.message);
      invalidateCache("org:my", "org:student");
      navigate("/dashboard/groups", { replace: true });
    } catch (e) {
      toast.error(errorMessage(e));
      setJoining(false);
    }
  };

  // Ro'yxatdan o'tib/kirib qaytganda — avtomatik qo'shilamiz
  useEffect(() => {
    if (autoTried.current || !data || !user || user.role !== "user" || data.member || !data.open || params.get("auto") !== "1") return;
    autoTried.current = true;
    join();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, user]);

  const toAuth = (path: "/register" | "/login") => {
    setReturnPath(`/join/${code}?auto=1`);
    navigate(path);
  };

  return (
    <main className="max-w-6xl mx-auto px-5 sm:px-8 py-14 sm:py-24">
      <Seo title="Guruhga taklif" noindex />
      {error ? (
        <div className="max-w-xl">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-[-0.04em] text-ink">Havola ishlamayapti</h1>
          <p className="mt-4 text-lg text-ink-2">{error}</p>
          <Link to="/" className="mt-8 h-12 px-6 inline-flex items-center rounded-full border border-line text-ink font-semibold hover:border-ink">
            Bosh sahifa
          </Link>
        </div>
      ) : !data ? (
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      ) : (
        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-10 lg:gap-16 items-start">
          <div>
            <p className="text-[15px] font-semibold text-brand">{data.org.name}</p>
            <h1 className="mt-3 text-4xl sm:text-[56px] font-extrabold tracking-[-0.045em] leading-[1.02] text-ink">{data.group.name}</h1>
            {data.group.description && <p className="mt-5 text-lg text-ink-2 max-w-xl whitespace-pre-line">{data.group.description}</p>}
            <p className="mt-6 text-[15px] text-muted">
              {data.teachers.length ? `O'qituvchi: ${data.teachers.join(", ")}` : ""}
              {data.teachers.length ? " · " : ""}
              {data.group.students} ta talaba qo'shilgan
            </p>
          </div>

          <div className="rounded-[22px] border border-line bg-surface p-6 sm:p-7 flex flex-col gap-5">
            <div>
              <h2 className="text-xl font-bold text-ink">Guruhga qo'shilish</h2>
              <p className="mt-2 text-[14px] text-ink-2 leading-relaxed">
                O'qituvchingiz DevReady'da topshiriq beradi: kodni brauzerda yozasiz, avtomatik testlar darhol tekshiradi, natijani o'qituvchi ko'radi. Guruh topshiriqlari
                bepul — markaz to'laydi.
              </p>
            </div>

            {!data.open ? (
              <Alert tone="warning">{REASON[data.reason || ""] || "Hozircha qo'shilib bo'lmaydi."}</Alert>
            ) : data.member ? (
              <>
                <Alert tone="success">Siz shu guruhdasiz.</Alert>
                <Button size="lg" onClick={() => navigate("/dashboard/groups")}>
                  Topshiriqlarni ochish
                </Button>
              </>
            ) : !user ? (
              <div className="flex flex-col gap-2.5">
                <Button size="lg" onClick={() => toAuth("/register")}>
                  Ro'yxatdan o'tib qo'shilish
                </Button>
                <Button size="lg" variant="outline" onClick={() => toAuth("/login")}>
                  Akkauntim bor — kirish
                </Button>
                <p className="text-[12px] text-muted mt-1">Ro'yxatdan o'tish Telegram orqali, bir daqiqa oladi. Keyin shu guruhga avtomatik qo'shilasiz.</p>
              </div>
            ) : user.role !== "user" ? (
              <>
                <Alert tone="info">Guruhga talaba akkaunti bilan qo'shiladi. Siz hozir {user.role === "mentor" ? "mentor" : "administrator"} sifatida kirgansiz.</Alert>
                <Button
                  variant="outline"
                  onClick={() => {
                    setReturnPath(`/join/${code}?auto=1`);
                    logout();
                  }}
                >
                  Boshqa akkaunt bilan kirish
                </Button>
              </>
            ) : (
              <>
                <p className="text-[14px] text-ink">
                  <b>{user.fullName}</b> sifatida qo'shilasiz.
                </p>
                <Button size="lg" onClick={join} loading={joining}>
                  Guruhga qo'shilish
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
