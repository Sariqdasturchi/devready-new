import { Link } from "react-router-dom";
import Seo from "../../components/Seo";

/** Mavjud bo'lmagan sahifa — qidiruvga chiqmaydi (soft-404 o'rniga) */
export default function NotFound() {
  return (
    <main className="min-h-[60vh] max-w-6xl mx-auto px-5 sm:px-8 py-24 flex flex-col items-start justify-center">
      <Seo title="Sahifa topilmadi" noindex />
      <p className="text-[15px] font-semibold text-brand">404</p>
      <h1 className="mt-3 text-4xl sm:text-5xl font-extrabold tracking-[-0.04em] text-ink">Bunday sahifa yo'q</h1>
      <p className="mt-4 text-lg text-ink-2 max-w-lg">Havola eskirgan yoki manzilda xato bor. Bosh sahifadan yoki blogdan davom eting.</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link to="/" className="h-12 px-6 inline-flex items-center rounded-full bg-brand text-white font-semibold hover:bg-brand-deep transition-colors">
          Bosh sahifa
        </Link>
        <Link to="/blogs" className="h-12 px-6 inline-flex items-center rounded-full border border-line text-ink font-semibold hover:border-ink">
          Blog
        </Link>
      </div>
    </main>
  );
}
