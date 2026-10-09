import { useEffect, useState, type ComponentType } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { HiOutlineArrowRightOnRectangle, HiOutlineBars3, HiOutlineXMark } from "react-icons/hi2";
import { getStoredUser, logout, updateStoredUser } from "../../lib/auth";
import { authApi } from "../../api/api";
import { Avatar, cx } from "../ui";
import Logo from "../Logo";
import NotificationBell from "./NotificationBell";
import type { User } from "../../types/type";

export type NavItem = { to: string; label: string; icon: ComponentType<{ size?: number; className?: string }>; end?: boolean };

const ROLE_LABEL: Record<string, string> = { user: "Talaba", mentor: "Mentor", superadmin: "Superadmin", admin: "Admin" };

export default function DashboardLayout({ nav, title }: { nav: NavItem[]; title: string }) {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<User | null>(getStoredUser());

  useEffect(() => {
    const sync = () => setUser(getStoredUser());
    window.addEventListener("devready:user", sync);
    return () => window.removeEventListener("devready:user", sync);
  }, []);

  // Rol/status serverda o'zgargan bo'lishi mumkin — bir marta yangilab olamiz
  useEffect(() => {
    authApi
      .me()
      .then((fresh) => updateStoredUser(fresh))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    setOpen(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const home = nav[0]?.to || "/";

  const sidebar = (
    <div className="flex flex-col h-full">
      <div className="px-3 pt-1 pb-7">
        <Logo to={home} />
      </div>
      <p className="px-3 mb-2 text-[12px] text-muted">{title}</p>
      <nav className="flex flex-col gap-0.5 flex-1 overflow-y-auto -mx-1 px-1">
        {nav.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cx(
                  "flex items-center gap-3 h-10 px-3 rounded-full text-[15px] transition-colors",
                  isActive ? "bg-ink text-white font-medium" : "text-ink-2 hover:bg-mist hover:text-ink",
                )
              }
            >
              <Icon size={19} className="shrink-0" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
      <div className="pt-4 mt-4 border-t border-line">
        <div className="flex items-center gap-3 px-2 py-2">
          <Avatar name={user?.fullName} src={user?.avatar} size={36} />
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-ink truncate">{user?.fullName || "Foydalanuvchi"}</p>
            <p className="text-[12px] text-muted truncate">
              {ROLE_LABEL[user?.role || "user"]}
              {user?.direction ? `, ${user.direction}` : ""}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={logout}
          className="mt-1 w-full flex items-center gap-3 h-10 px-3 rounded-full text-[15px] text-ink-2 hover:bg-mist hover:text-ink cursor-pointer"
        >
          <HiOutlineArrowRightOnRectangle size={19} /> Chiqish
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh bg-mist text-ink lg:flex">
      <aside className="hidden lg:block w-64 shrink-0 h-dvh sticky top-0 border-r border-line bg-white px-3 py-5">{sidebar}</aside>

      {open && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 max-w-[85vw] bg-white px-3 py-5 shadow-2xl">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-4 w-9 h-9 inline-flex items-center justify-center rounded-full text-ink-2 hover:bg-mist cursor-pointer"
              aria-label="Menyuni yopish"
            >
              <HiOutlineXMark size={22} />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-40 h-16 bg-mist/85 backdrop-blur-md flex items-center justify-between px-4 sm:px-8">
          <div className="flex items-center gap-3 lg:hidden">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="w-10 h-10 -ml-2 inline-flex items-center justify-center rounded-full text-ink hover:bg-white cursor-pointer"
              aria-label="Menyuni ochish"
            >
              <HiOutlineBars3 size={22} />
            </button>
            <Logo to={home} />
          </div>
          <div className="hidden lg:block" />
          <NotificationBell />
        </header>
        <main className="flex-1 w-full max-w-[1200px] mx-auto px-4 sm:px-8 pt-2 pb-12">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
