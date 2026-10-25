import { useMemo } from "react";
import { HiOutlineAcademicCap, HiOutlineBanknotes, HiOutlineClipboardDocumentCheck, HiOutlineClipboardDocumentList, HiOutlineCog6Tooth, HiOutlineHome } from "react-icons/hi2";
import DashboardLayout, { type NavItem } from "../../components/layout/DashboardLayout";
import { useOrgMe } from "../../hooks/useOrgMe";

const NAV: NavItem[] = [
  { to: "/mentor/dashboard", label: "Bosh sahifa", icon: HiOutlineHome, end: true },
  { to: "/mentor/dashboard/submissions", label: "Tekshiruvlar", icon: HiOutlineClipboardDocumentCheck },
  { to: "/mentor/dashboard/tasks", label: "Tasklar", icon: HiOutlineClipboardDocumentList },
  { to: "/mentor/dashboard/earnings", label: "Daromadim", icon: HiOutlineBanknotes },
  { to: "/mentor/dashboard/settings", label: "Sozlamalar", icon: HiOutlineCog6Tooth },
];

export default function MentorDashboardLayout() {
  // Mentor o'quv markazida o'qituvchi ham bo'lishi mumkin
  const orgMe = useOrgMe();
  const nav = useMemo(() => (orgMe.data?.orgs.length ? [...NAV, { to: "/teach", label: "O'quv markazi", icon: HiOutlineAcademicCap }] : NAV), [orgMe.data]);
  return <DashboardLayout nav={nav} title="Mentor paneli" />;
}
