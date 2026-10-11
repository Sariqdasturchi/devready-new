import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { HiOutlineMagnifyingGlass } from "react-icons/hi2";
import { blogApi } from "../../api/api";
import { formatDate, mediaUrl } from "../../lib/format";
import type { Blogs } from "../../types/type";
import { stripMarkdown } from "../../components/Markdown";

export default function BlogPage() {
  const [blogs, setBlogs] = useState<Blogs[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tag, setTag] = useState("Barchasi");

  useEffect(() => {
    blogApi
      .list()
      .then(setBlogs)
      .catch(() => setBlogs([]))
      .finally(() => setLoading(false));
  }, []);

  const tags = useMemo(() => ["Barchasi", ...Array.from(new Set(blogs.flatMap((b) => b.tags)))], [blogs]);
  const q = search.trim().toLowerCase();
  const visible = blogs.filter(
    (b) => (tag === "Barchasi" || b.tags.some((t) => t.toLowerCase() === tag.toLowerCase())) && (b.title.toLowerCase().includes(q) || b.text.toLowerCase().includes(q)),
  );

  return (
    <main className="max-w-6xl mx-auto px-5 sm:px-8 pt-16 sm:pt-24 pb-24">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-12">
        <div>
          <h1 className="text-5xl sm:text-6xl font-extrabold tracking-[-0.045em] text-ink">Blog</h1>
          <p className="mt-4 text-lg text-ink-2 max-w-xl">Karyera, texnik suhbat va amaliy dasturlash haqida maqolalar.</p>
        </div>
        <label className="relative w-full lg:w-80">
          <span className="sr-only">Qidirish</span>
          <HiOutlineMagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Maqolalarni qidirish"
            className="w-full h-12 pl-11 pr-4 rounded-full border border-line bg-white text-[15px] text-ink placeholder:text-muted focus:outline-none focus:border-ink"
          />
        </label>
      </div>

      {tags.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2 mb-10 -mx-5 px-5 sm:mx-0 sm:px-0">
          {tags.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTag(t)}
              className={`h-10 px-4 rounded-full text-[15px] font-medium whitespace-nowrap border cursor-pointer transition-colors ${
                tag === t ? "bg-ink border-ink text-white" : "border-line text-ink-2 hover:border-ink"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="page-loader !min-h-[240px]">
          <span />
        </div>
      ) : visible.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-12">
          {visible.map((b, i) => (
            <Link key={b._id} to={`/blogs/${b._id}`} className="group flex flex-col">
              <div className="aspect-[16/9] rounded-2xl overflow-hidden bg-mist border border-line">
                {b.image ? (
                  <img src={mediaUrl(b.image)} alt="" className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" />
                ) : (
                  // Rasm yo'q — tegdan tipografik muqova (uch xil rang navbatma-navbat)
                  <div
                    className={`w-full h-full flex flex-col justify-between p-6 ${
                      ["bg-ink text-white", "bg-brand text-white", "bg-mist text-ink"][i % 3]
                    }`}
                  >
                    <span className="text-[13px] font-semibold opacity-60">devready / blog</span>
                    <span className="text-[34px] leading-none font-extrabold tracking-[-0.04em]">{b.tags[0] || "Maqola"}</span>
                  </div>
                )}
              </div>
              <p className="mt-5 text-sm text-muted">
                {b.tags[0] ? `${b.tags[0]}, ` : ""}
                {formatDate(b.createdAt)}
              </p>
              <h2 className="mt-2 text-xl font-bold tracking-[-0.02em] leading-snug text-ink group-hover:text-brand transition-colors">{b.title}</h2>
              <p className="mt-2 text-[15px] text-ink-2 leading-relaxed line-clamp-3">{stripMarkdown(b.text)}</p>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-line py-20 text-center">
          <p className="text-lg font-semibold text-ink">{blogs.length ? "Hech narsa topilmadi" : "Hozircha maqolalar yo'q"}</p>
          <p className="mt-1 text-muted">{blogs.length ? "Boshqa so'z bilan qidirib ko'ring." : "Birinchi maqolalar tez orada chiqadi."}</p>
        </div>
      )}
    </main>
  );
}
