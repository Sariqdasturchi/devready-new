import React from "react";

export default function ServicesHome({
  title, desc, icon, background
}: {
  title: string;
  desc: string;
  icon?: React.ReactNode;
  background?: string;
}) {
  return (
    <div className="dark-card rounded-2xl p-7 flex flex-col gap-4 group cursor-pointer h-full border border-white/10 hover:border-emerald-400/40 transition-all duration-300">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shadow-[0_0_15px_rgba(16,185,129,0.15)] group-hover:scale-110 transition-transform duration-300 ${background || 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'}`}>
        {icon}
      </div>
      <div className="flex flex-col gap-2 pt-1">
        <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors leading-snug">{title}</h3>
        <p className="text-xs sm:text-sm text-gray-400 leading-relaxed font-normal">{desc}</p>
      </div>
    </div>
  );
}