import { HiOutlineBanknotes, HiOutlineClipboardDocumentCheck, HiOutlineClipboardDocumentList, HiOutlineCog6Tooth, HiOutlineHome } from "react-icons/hi2";
import DashboardLayout, { type NavItem } from "../../components/layout/DashboardLayout";

const NAV: NavItem[] = [
  { to: "/mentor/dashboard", label: "Bosh sahifa", icon: HiOutlineHome, end: true },
  { to: "/mentor/dashboard/submissions", label: "Tekshiruvlar", icon: HiOutlineClipboardDocumentCheck },
  { to: "/mentor/dashboard/tasks", label: "Tasklar", icon: HiOutlineClipboardDocumentList },
  { to: "/mentor/dashboard/earnings", label: "Daromadim", icon: HiOutlineBanknotes },
  { to: "/mentor/dashboard/settings", label: "Sozlamalar", icon: HiOutlineCog6Tooth },
];

export default function MentorDashboardLayout() {
  return <DashboardLayout nav={NAV} title="Mentor paneli" />;
}
