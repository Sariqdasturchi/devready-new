import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { HiOutlineBars3, HiOutlineXMark } from "react-icons/hi2";
import { menuList } from "../../config/config";
import { getStoredUser, getToken, homeForRole } from "../../lib/auth";
import Logo from "../Logo";
import ThemeToggle from "../ThemeToggle";

export default function Header() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const user = getToken() ? getStoredUser() : null;
  const cabinet = user ? homeForRole(user.role) : null;

  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const linkCls = ({ isActive }: { isActive: boolean }) =>
    `text-[15px] transition-colors ${isActive ? "text-ink font-semibold" : "text-muted hover:text-ink"}`;

  return (
    <header className={`sticky top-0 z-50 bg-paper/90 backdrop-blur-md transition-shadow ${scrolled ? "shadow-[0_1px_0_var(--color-line)]" : ""}`}>
      <nav className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between gap-6">
        <Logo />

        <ul className="hidden md:flex items-center gap-8">
          {menuList.map((item) => (
            <li key={item.id}>
              <NavLink to={item.path} end={item.path === "/"} className={linkCls}>
                {item.name}
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="hidden md:flex items-center gap-2">
          <ThemeToggle />
          {cabinet ? (
            <Link to={cabinet} className="h-10 px-5 inline-flex items-center rounded-full bg-brand text-white text-sm font-semibold hover:bg-brand-deep transition-colors">
              Kabinetga o'tish
            </Link>
          ) : (
            <>
              <Link to="/login" className="h-10 px-4 inline-flex items-center rounded-full text-sm font-semibold text-ink hover:bg-mist">
                Kirish
              </Link>
              <Link to="/register" className="h-10 px-5 inline-flex items-center rounded-full bg-brand text-white text-sm font-semibold hover:bg-brand-deep transition-colors">
                Bepul boshlash
              </Link>
            </>
          )}
        </div>

        <div className="md:hidden flex items-center gap-1 -mr-2">
        <ThemeToggle />
        <button
          type="button"
          className="p-2 rounded-full text-ink hover:bg-mist cursor-pointer"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Menyuni yopish" : "Menyuni ochish"}
          aria-expanded={open}
        >
          {open ? <HiOutlineXMark size={24} /> : <HiOutlineBars3 size={24} />}
        </button>
        </div>
      </nav>

      {open && (
        <div className="md:hidden border-t border-line bg-surface px-5 pb-6 pt-2">
          <ul className="flex flex-col">
            {menuList.map((item) => (
              <li key={item.id}>
                <NavLink to={item.path} end={item.path === "/"} className={({ isActive }) => `block py-3 text-lg ${isActive ? "text-ink font-semibold" : "text-ink-2"}`}>
                  {item.name}
                </NavLink>
              </li>
            ))}
          </ul>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {cabinet ? (
              <Link to={cabinet} className="col-span-2 h-12 inline-flex items-center justify-center rounded-full bg-brand text-white font-semibold">
                Kabinetga o'tish
              </Link>
            ) : (
              <>
                <Link to="/login" className="h-12 inline-flex items-center justify-center rounded-full border border-line font-semibold text-ink">
                  Kirish
                </Link>
                <Link to="/register" className="h-12 inline-flex items-center justify-center rounded-full bg-brand text-white font-semibold">
                  Boshlash
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
