import { Link } from "react-router-dom";

/** devready so'z belgisi — oxirida kod muharriridagi kursor */
export default function Logo({ to = "/", inverted = false, className = "" }: { to?: string; inverted?: boolean; className?: string }) {
  return (
    <Link to={to} aria-label="DevReady — bosh sahifa" className={`inline-flex items-center select-none ${className}`}>
      <span className={`text-[21px] font-extrabold tracking-[-0.04em] leading-none ${inverted ? "text-white" : "text-ink"}`}>devready</span>
      <span aria-hidden className="ml-[3px] inline-block w-[9px] h-[19px] rounded-[2px] bg-brand translate-y-[1px]" />
    </Link>
  );
}
