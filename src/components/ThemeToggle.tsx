import { HiOutlineMoon, HiOutlineSun } from "react-icons/hi2";
import { useTheme } from "../lib/theme";

/** Yorug' / qorong'i mavzu tugmasi */
export default function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const dark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Yorug' mavzuga o'tish" : "Qorong'i mavzuga o'tish"}
      title={dark ? "Yorug' mavzu" : "Qorong'i mavzu"}
      className={`h-10 w-10 inline-flex items-center justify-center rounded-full text-ink-2 hover:text-ink hover:bg-mist transition-colors cursor-pointer ${className}`}
    >
      {dark ? <HiOutlineSun size={20} /> : <HiOutlineMoon size={19} />}
    </button>
  );
}
