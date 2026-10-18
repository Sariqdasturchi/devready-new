import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Header from "../header/Header";
import Footer from "../footer/Footer";
import { trackVisit } from "../../lib/track";

/** Sahifa almashganda tepaga, "#bo'lim" bo'lsa — o'sha bo'limga */
function ScrollManager() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.slice(1));
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

export default function LandingLayout() {
  useEffect(() => trackVisit(), []);
  return (
    <div className="min-h-dvh flex flex-col bg-paper">
      <ScrollManager />
      <Header />
      <div className="flex-1">
        <Outlet />
      </div>
      <Footer />
    </div>
  );
}
