import {
  HiOutlineAcademicCap,
  HiOutlineBanknotes,
  HiOutlineClipboardDocumentCheck,
  HiOutlineClipboardDocumentList,
  HiOutlineCog6Tooth,
  HiOutlineCreditCard,
  HiOutlineDocumentText,
  HiOutlineHome,
  HiOutlineQuestionMarkCircle,
  HiOutlineTicket,
  HiOutlineUsers,
  HiOutlineWallet,
  HiOutlineFunnel,
  HiOutlineTrophy,
} from "react-icons/hi2";
import DashboardLayout, { type NavItem } from "../../components/layout/DashboardLayout";

const NAV: NavItem[] = [
  { to: "/superadmin/dashboard", label: "Statistika", icon: HiOutlineHome, end: true },
  { to: "/superadmin/dashboard/funnel", label: "Voronka", icon: HiOutlineFunnel },
  { to: "/superadmin/dashboard/users", label: "Foydalanuvchilar", icon: HiOutlineUsers },
  { to: "/superadmin/dashboard/mentors", label: "Mentorlar", icon: HiOutlineAcademicCap },
  { to: "/superadmin/dashboard/tasks", label: "Tasklar", icon: HiOutlineClipboardDocumentList },
  { to: "/superadmin/dashboard/contests", label: "Musobaqalar", icon: HiOutlineTrophy },
  { to: "/superadmin/dashboard/submissions", label: "Topshiriqlar", icon: HiOutlineClipboardDocumentCheck },
  { to: "/superadmin/dashboard/payments", label: "To'lovlar", icon: HiOutlineBanknotes },
  { to: "/superadmin/dashboard/payouts", label: "Mentor to'lovlari", icon: HiOutlineWallet },
  { to: "/superadmin/dashboard/plans", label: "Tariflar", icon: HiOutlineCreditCard },
  { to: "/superadmin/dashboard/promos", label: "Promokodlar", icon: HiOutlineTicket },
  { to: "/superadmin/dashboard/blogs", label: "Postlar", icon: HiOutlineDocumentText },
  { to: "/superadmin/dashboard/questions", label: "Test savollari", icon: HiOutlineQuestionMarkCircle },
  { to: "/superadmin/dashboard/settings", label: "Sozlamalar", icon: HiOutlineCog6Tooth },
];

export default function SuperadminDashboardLayout() {
  return <DashboardLayout nav={NAV} title="Superadmin" />;
}
