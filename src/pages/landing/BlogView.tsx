import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { HiOutlineArrowLeft, HiOutlineCalendar, HiOutlineClock, HiOutlineEye, HiOutlineLink, HiOutlinePaperAirplane } from "react-icons/hi2";
import { blogApi } from "../../api/api";
import { formatDate, mediaUrl } from "../../lib/format";
import type { Blogs } from "../../types/type";
import Markdown, { markdownHeadings, stripMarkdown } from "../../components/Markdown";
import { useToast } from "../../components/ui/toast";
import Seo from "../../components/Seo";
import { SITE_URL, breadcrumbs } from "../../lib/seo";

/** Qidiruv natijasi uchun ~155 belgilik tavsif (so'z o'rtasida kesmasdan) */
function describe(blog: Blogs) {
  const t = blog.excerpt?.trim() || stripMarkdown(blog.text);
  if (t.length <= 160) return t;
  const cut = t.slice(0, 157);
  return `${cut.slice(0, cut.lastIndexOf(" "))}…`;
}

const readTime = (text: string) => Math.max(1, Math.ceil(stripMarkdown(text).split(/\s+/).length / 200));

/** Sahifa tepasidagi o'qish jarayoni chizig'i */
function ReadingProgress() {
  const [p, setP] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      setP(max > 0 ? Math.min(1, el.scrollTop / max) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);
  return (
    <div className="fixed top-0 inset-x-0 z-[60] h-[3px] pointer-events-none" aria-hidden>
      <div className="h-full bg-brand origin-left" style={{ transform: `scaleX(${p})` }} />
    </div>
  );
}

/** Hozir ekranda turgan bo'lim (mundarijada belgilash uchun) */
function useActiveHeading(ids: string[]) {
  const [active, setActive] = useState("");
  useEffect(() => {
    if (!ids.length) return;
    const onScroll = () => {
      let cur = "";
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top < 140) cur = id;
      }
      setActive(cur);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [ids]);
  return active;
}

function Toc({ items, active }: { items: { id: string; title: string }[]; active: string }) {
  return (
    <ol className="flex flex-col border-l border-line">
      {items.map((h) => (
        <li key={h.id}>
          <a
            href={`#${h.id}`}
            className={`-ml-px block border-l-2 py-1.5 pl-4 text-[14px] leading-snug transition-colors ${
              active === h.id ? "border-brand text-ink font-medium" : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {h.title}
          </a>
        </li>
      ))}
    </ol>
  );
}

function ShareButtons({ title }: { title: string }) {
  const toast = useToast();
  const url = typeof window !== "undefined" ? window.location.href : "";
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Havola nusxalandi");
    } catch {
      toast.error("Nusxalab bo'lmadi");
    }
  };
  const btn = "h-10 px-4 inline-flex items-center gap-2 rounded-full border border-line text-[14px] font-medium text-ink hover:border-ink transition-colors cursor-pointer";
  return (
    <div className="flex flex-wrap gap-2">
      <a className={btn} href={`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`} target="_blank" rel="noopener noreferrer">
        <HiOutlinePaperAirplane size={16} /> Telegramda ulashish
      </a>
      <button type="button" className={btn} onClick={copy}>
        <HiOutlineLink size={16} /> Havolani nusxalash
      </button>
    </div>
  );
}

function RelatedCard({ b, i }: { b: Blogs; i: number }) {
  return (
    <Link to={`/blogs/${b.slug || b._id}`} className="group flex flex-col">
      <div className="aspect-[16/9] rounded-2xl overflow-hidden bg-mist border border-line">
        {b.image ? (
          <img src={mediaUrl(b.image)} alt="" loading="lazy" className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" />
        ) : (
          <div className={`w-full h-full flex items-end p-6 ${["bg-ink text-white", "bg-brand text-white", "bg-mist text-ink"][i % 3]}`}>
            <span className="text-[28px] leading-none font-extrabold tracking-[-0.04em]">{b.tags[0] || "Maqola"}</span>
          </div>
        )}
      </div>
      <p className="mt-4 text-sm text-muted">
        {b.tags[0] ? `${b.tags[0]}, ` : ""}
        {readTime(b.text)} daqiqa
      </p>
      <h3 className="mt-1.5 text-lg font-bold tracking-[-0.02em] leading-snug text-ink group-hover:text-brand transition-colors text-balance">{b.title}</h3>
    </Link>
  );
}

export default function BlogView() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [blog, setBlog] = useState<Blogs | null>(null);
  const [all, setAll] = useState<Blogs[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // id → slug almashganda maqola qayta yuklanmaydi (ko'rishlar soni ikki marta oshmasin)
    if (blog && (blog.slug === id || blog._id === id)) return;
    setLoading(true);
    window.scrollTo(0, 0);
    blogApi
      .get(id)
      .then(setBlog)
      .catch(() => setBlog(null))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    blogApi
      .list()
      .then(setAll)
      .catch(() => setAll([]));
  }, []);

  // Eski /blogs/<id> havolasi — o'qiladigan /blogs/<slug> manziliga almashtiriladi
  useEffect(() => {
    if (blog?.slug && id !== blog.slug) navigate(`/blogs/${blog.slug}`, { replace: true });
  }, [blog, id, navigate]);

  const headings = useMemo(() => (blog ? markdownHeadings(blog.text) : []), [blog]);
  const ids = useMemo(() => headings.map((h) => h.id), [headings]);
  const active = useActiveHeading(ids);

  // O'xshash maqolalar: avval bir xil tegli, keyin eng yangilari
  const related = useMemo(() => {
    if (!blog) return [];
    const tags = new Set(blog.tags.map((t) => t.toLowerCase()));
    const others = all.filter((b) => b._id !== blog._id);
    const score = (b: Blogs) => b.tags.filter((t) => tags.has(t.toLowerCase())).length;
    return [...others].sort((a, b) => score(b) - score(a)).slice(0, 3);
  }, [all, blog]);

  if (loading) {
    return (
      <div className="page-loader !min-h-[60vh]">
        <span />
      </div>
    );
  }

  if (!blog) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-5 text-center">
        <Seo title="Maqola topilmadi" noindex />
        <p className="text-2xl font-bold text-ink">Maqola topilmadi</p>
        <p className="text-muted">U o'chirilgan yoki havola noto'g'ri.</p>
        <Link to="/blogs" className="mt-2 h-11 px-5 inline-flex items-center rounded-full border border-line font-semibold hover:border-ink">
          Barcha maqolalar
        </Link>
      </div>
    );
  }

  const showToc = headings.length >= 2;
  const path = `/blogs/${blog.slug || blog._id}`;
  const description = describe(blog);
  const cover = blog.image ? mediaUrl(blog.image) : undefined;

  return (
    <>
      <Seo
        title={blog.title}
        description={description}
        path={path}
        image={cover}
        type="article"
        article={{ publishedTime: blog.createdAt, modifiedTime: blog.updatedAt, tags: blog.tags }}
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: blog.title,
            description,
            image: cover ? [cover] : undefined,
            datePublished: blog.createdAt,
            dateModified: blog.updatedAt || blog.createdAt,
            inLanguage: "uz",
            keywords: blog.tags.join(", "),
            wordCount: stripMarkdown(blog.text).split(/\s+/).length,
            mainEntityOfPage: `${SITE_URL}${path}`,
            author: { "@type": "Organization", name: "DevReady", url: SITE_URL },
            publisher: { "@type": "Organization", name: "DevReady", logo: { "@type": "ImageObject", url: `${SITE_URL}/web-app-manifest-512x512.png` } },
          },
          breadcrumbs([
            { name: "Bosh sahifa", path: "/" },
            { name: "Blog", path: "/blogs" },
            { name: blog.title, path },
          ]),
        ]}
      />
      <ReadingProgress />
      <main className="pb-24">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 pt-10 sm:pt-14 grid xl:grid-cols-[1fr_minmax(0,42rem)_1fr] xl:gap-x-14">
          <article className="xl:col-start-2 min-w-0">
            <Link to="/blogs" className="inline-flex items-center gap-2 text-[15px] text-muted hover:text-ink transition-colors">
              <HiOutlineArrowLeft /> Barcha maqolalar
            </Link>

            <header className="mt-10">
              {blog.tags.length > 0 && (
                <ul className="flex flex-wrap gap-2">
                  {blog.tags.map((t) => (
                    <li key={t} className="h-7 px-3 inline-flex items-center rounded-full bg-brand-tint text-brand text-[13px] font-semibold">
                      {t}
                    </li>
                  ))}
                </ul>
              )}
              <h1 className="mt-5 text-[34px] sm:text-[46px] font-extrabold tracking-[-0.035em] leading-[1.1] text-ink text-balance">{blog.title}</h1>
              <dl className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-[15px] text-muted">
                <div className="inline-flex items-center gap-2">
                  <dt className="sr-only">Sana</dt>
                  <HiOutlineCalendar size={17} aria-hidden />
                  <dd>
                    <time dateTime={blog.createdAt}>{formatDate(blog.createdAt)}</time>
                  </dd>
                </div>
                <div className="inline-flex items-center gap-2">
                  <dt className="sr-only">O'qish vaqti</dt>
                  <HiOutlineClock size={17} aria-hidden />
                  <dd>{readTime(blog.text)} daqiqa o'qish</dd>
                </div>
                {blog.views > 0 && (
                  <div className="inline-flex items-center gap-2">
                    <dt className="sr-only">Ko'rishlar</dt>
                    <HiOutlineEye size={17} aria-hidden />
                    <dd>{blog.views} marta o'qilgan</dd>
                  </div>
                )}
              </dl>
            </header>

            {blog.image && (
              <figure className="mt-10">
                <img src={mediaUrl(blog.image)} alt={blog.title} width={1600} height={900} fetchPriority="high" className="w-full h-auto aspect-[16/9] object-cover rounded-2xl border border-line bg-mist" />
              </figure>
            )}

            {showToc && (
              <details className="xl:hidden mt-8 rounded-2xl border border-line px-5 group">
                <summary className="h-14 flex items-center justify-between cursor-pointer list-none font-semibold text-ink">
                  Mundarija
                  <span className="text-muted text-sm font-normal group-open:hidden">{headings.length} bo'lim</span>
                  <span className="text-muted text-sm font-normal hidden group-open:inline">Yopish</span>
                </summary>
                <div className="pb-4">
                  <Toc items={headings} active={active} />
                </div>
              </details>
            )}

            <div className="mt-10 sm:mt-12">
              <Markdown text={blog.text} lead />
            </div>

            <footer className="mt-14 pt-8 border-t border-line flex flex-col gap-4">
              <p className="font-semibold text-ink">Foydali bo'ldimi? Do'stingizga yuboring</p>
              <ShareButtons title={blog.title} />
            </footer>
          </article>

          {showToc && (
            <aside className="hidden xl:block xl:col-start-3 pt-[4.5rem]">
              <div className="sticky top-28">
                <p className="mb-3 text-[14px] font-semibold text-ink">Mundarija</p>
                <Toc items={headings} active={active} />
              </div>
            </aside>
          )}
        </div>

        <section className="max-w-6xl mx-auto px-5 sm:px-8 mt-20">
          <div className="rounded-3xl bg-ink text-white px-7 py-10 sm:px-12 sm:py-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-xl">
              <h2 className="text-[26px] sm:text-[32px] font-extrabold tracking-[-0.03em] leading-tight">O'qiganingizni amalda sinab ko'ring</h2>
              <p className="mt-3 text-white/70 text-[17px] leading-relaxed">Real tasklarni yeching, mentordan kodingizga izoh oling va portfolioni to'ldiring.</p>
            </div>
            <Link to="/register" className="shrink-0 h-12 px-6 inline-flex items-center justify-center rounded-full bg-brand text-white font-semibold hover:bg-brand-deep transition-colors">
              Bepul boshlash
            </Link>
          </div>
        </section>

        {related.length > 0 && (
          <section className="max-w-6xl mx-auto px-5 sm:px-8 mt-20">
            <div className="flex items-baseline justify-between gap-4 mb-8">
              <h2 className="text-[26px] sm:text-[30px] font-extrabold tracking-[-0.03em] text-ink">Yana o'qing</h2>
              <Link to="/blogs" className="text-[15px] font-medium text-muted hover:text-ink">
                Barcha maqolalar
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10">
              {related.map((b, i) => (
                <RelatedCard key={b._id} b={b} i={i} />
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
