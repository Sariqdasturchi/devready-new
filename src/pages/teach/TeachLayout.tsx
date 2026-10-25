import { HiOutlineArrowUturnLeft, HiOutlineUserGroup } from "react-icons/hi2";
import DashboardLayout, { type NavItem } from "../../components/layout/DashboardLayout";
import { getStoredUser, homeForRole } from "../../lib/auth";
import { useOrgMe } from "../../hooks/useOrgMe";

/** O'qituvchi paneli: markaz guruhlari, nazorat jadvali va tekshiruv */
export default function TeachLayout() {
  const home = homeForRole(getStoredUser()?.role);
  const nav: NavItem[] = [
    { to: "/teach", label: "Guruhlar", icon: HiOutlineUserGroup },
    { to: home, label: "Kabinetga qaytish", icon: HiOutlineArrowUturnLeft, end: true },
  ];
  const me = useOrgMe();
  const owner = me.data?.orgs.some((o) => o.role === "owner");
  return <DashboardLayout nav={nav} title="O'quv markazi" roleLabel={getStoredUser()?.role === "superadmin" ? "Superadmin" : owner ? "Markaz egasi" : "O'qituvchi"} />;
}
