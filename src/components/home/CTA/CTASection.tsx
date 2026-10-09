import { Link } from "react-router-dom";
import { HiArrowRight } from "react-icons/hi";

export default function CTASection() {
  return (
    <section className="w-full py-24 bg-[#05070a] relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-transparent pointer-events-none" />

      <div className="max-w-4xl mx-auto px-6 text-center flex flex-col items-center gap-6 relative z-10">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight font-display">
          Kelajakdagi karyerangizni <br className="hidden sm:inline" />
          bugun quring
        </h2>
        <p className="text-gray-400 text-sm sm:text-base max-w-xl leading-relaxed font-normal">
          Dunyo bo'ylab minglab dasturchilar <strong className="text-white">devready</strong> bilan o'z bilimlarini amaliyotda mustahklamoqda. Siz-chi?
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
          <Link
            to="/register"
            className="inline-flex items-center gap-3 bg-white text-gray-950 font-bold text-xs uppercase tracking-widest px-8 py-4 rounded-full shadow-[0_0_30px_rgba(255,255,255,0.25)] hover:bg-emerald-400 hover:shadow-[0_0_35px_rgba(16,185,129,0.6)] hover:scale-105 transition-all duration-300 group"
          >
            <span>RO'YXATDAN O'TISH</span>
            <span className="w-7 h-7 rounded-full bg-emerald-400 text-gray-950 group-hover:bg-gray-950 group-hover:text-emerald-400 flex items-center justify-center transition-colors">
              <HiArrowRight className="text-sm" />
            </span>
          </Link>

          <Link
            to="/mentors"
            className="px-8 py-4 rounded-full text-xs font-bold uppercase tracking-wider border border-white/20 text-white hover:bg-white/10 transition-all duration-300"
          >
            BIZ HAQIMIZDA
          </Link>
        </div>
      </div>
    </section>
  );
}