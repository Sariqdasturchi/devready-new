import type { ReactNode } from "react";
import Logo from "../Logo";

/** Kirish/ro'yxatdan o'tish sahifalari: chapda forma, katta ekranda o'ngda qora panel */
export default function AuthShell({ children, wide }: { children: ReactNode; wide?: boolean }) {
  return (
    <main className="min-h-dvh grid lg:grid-cols-[1fr_minmax(420px,0.85fr)] bg-white">
      <div className="flex flex-col px-5 sm:px-10 py-6">
        <Logo />
        <div className="flex-1 flex items-center justify-center py-10">
          <div className={`w-full ${wide ? "max-w-[30rem]" : "max-w-[24rem]"}`}>{children}</div>
        </div>
      </div>
      <aside className="hidden lg:flex flex-col justify-between bg-ink text-white p-12 xl:p-16">
        <p className="text-sm text-white/50">DevReady</p>
        <div>
          <p className="text-4xl xl:text-5xl font-extrabold tracking-[-0.045em] leading-[1.05] text-balance">Har bir task — portfoliongizdagi yana bitta ish.</p>
          <ul className="mt-10 flex flex-col gap-4 text-white/70 text-[17px]">
            <li>Real loyihalarga o'xshash vazifalar</li>
            <li>Har bir taskga aniq muddat</li>
            <li>Mentordan ball va batafsil izoh</li>
          </ul>
        </div>
        <p className="text-sm text-white/40">Kodlar Telegram bot orqali keladi — parol eslab qolish shart emas.</p>
      </aside>
    </main>
  );
}

export function AuthMessage({ text, tone }: { text: string; tone: "error" | "success" }) {
  if (!text) return null;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`mb-5 px-4 py-3 rounded-xl text-[14px] leading-relaxed ${tone === "success" ? "bg-brand-tint text-brand-deep" : "bg-rose-50 text-rose-700"}`}
    >
      {text}
    </div>
  );
}
