import { useEffect } from "react";
import {
  HiOutlineCheckCircle,
  HiOutlineClipboardDocumentList,
  HiOutlineCog6Tooth,
  HiOutlineCreditCard,
  HiOutlineHome,
  HiOutlineSparkles,
  HiOutlineStar,
  HiOutlineTrophy,
} from "react-icons/hi2";
import DashboardLayout, { type NavItem } from "../../components/layout/DashboardLayout";
import { analyticsApi } from "../../api/api";

const NAV: NavItem[] = [
  { to: "/dashboard", label: "Bosh sahifa", icon: HiOutlineHome, end: true },
  { to: "/dashboard/tasks", label: "Vazifalar", icon: HiOutlineClipboardDocumentList },
  { to: "/dashboard/completed", label: "Natijalarim", icon: HiOutlineCheckCircle },
  { to: "/dashboard/points", label: "Ballarim", icon: HiOutlineStar },
  { to: "/dashboard/leaderboard", label: "Liderboard", icon: HiOutlineTrophy },
  { to: "/dashboard/achievements", label: "Yutuqlar", icon: HiOutlineSparkles },
  { to: "/dashboard/plans", label: "Tarif", icon: HiOutlineCreditCard },
  { to: "/dashboard/settings", label: "Sozlamalar", icon: HiOutlineCog6Tooth },
];

export default function UserDashboardLayout() {
  // Kunlik faollik (streak va kalendar uchun) — kuniga bir marta
  useEffect(() => {
    const key = `visit:${new Date().toDateString()}`;
    try {
      if (localStorage.getItem("lastVisit") === key) return;
      localStorage.setItem("lastVisit", key);
    } catch {
      /* ignore */
    }
    analyticsApi.recordVisit();
  }, []);

  return <DashboardLayout nav={NAV} title="Talaba kabineti" />;
}
