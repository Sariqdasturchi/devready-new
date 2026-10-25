import { useEffect, useMemo } from "react";
import {
  HiOutlineAcademicCap,
  HiOutlineUserGroup,
  HiOutlineCheckCircle,
  HiOutlineClipboardDocumentList,
  HiOutlineCog6Tooth,
  HiOutlineCreditCard,
  HiOutlineHome,
  HiOutlineSparkles,
  HiOutlineStar,
  HiOutlineTrophy,
  HiOutlineFlag,
} from "react-icons/hi2";
import DashboardLayout, { type NavItem } from "../../components/layout/DashboardLayout";
import { analyticsApi } from "../../api/api";
import { useOrgMe } from "../../hooks/useOrgMe";

const NAV: NavItem[] = [
  { to: "/dashboard", label: "Bosh sahifa", icon: HiOutlineHome, end: true },
  { to: "/dashboard/tasks", label: "Vazifalar", icon: HiOutlineClipboardDocumentList },
  { to: "/dashboard/completed", label: "Natijalarim", icon: HiOutlineCheckCircle },
  { to: "/dashboard/points", label: "Ballarim", icon: HiOutlineStar },
  { to: "/dashboard/leaderboard", label: "Liderboard", icon: HiOutlineTrophy },
  { to: "/contests", label: "Musobaqa", icon: HiOutlineFlag },
  { to: "/dashboard/achievements", label: "Yutuqlar", icon: HiOutlineSparkles },
  { to: "/dashboard/plans", label: "Tarif", icon: HiOutlineCreditCard },
  { to: "/dashboard/settings", label: "Sozlamalar", icon: HiOutlineCog6Tooth },
];

export default function UserDashboardLayout() {
  // Guruhga qo'shilgan talabaga "Guruhim", o'qituvchiga "O'quv markazi" bo'limi
  const orgMe = useOrgMe();
  const nav = useMemo(() => {
    const items = [...NAV];
    if (orgMe.data?.studentGroups) items.splice(2, 0, { to: "/dashboard/groups", label: "Guruhim", icon: HiOutlineUserGroup });
    if (orgMe.data?.orgs.length) items.push({ to: "/teach", label: "O'quv markazi", icon: HiOutlineAcademicCap });
    return items;
  }, [orgMe.data]);

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

  return <DashboardLayout nav={nav} title="Talaba kabineti" />;
}
