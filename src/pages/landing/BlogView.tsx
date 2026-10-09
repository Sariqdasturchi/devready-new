import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { HiOutlineArrowLeft } from "react-icons/hi2";
import { blogApi } from "../../api/api";
import { formatDate, mediaUrl } from "../../lib/format";
import type { Blogs } from "../../types/type";

const readTime = (text: string) => Math.max(1, Math.ceil(text.trim().split(/\s+/).length / 200));

export default function BlogView() {
  const { id = "" } = useParams();
  const [blog, setBlog] = useState<Blogs | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    blogApi
      .get(id)
      .then(setBlog)
      .catch(() => setBlog(null))
      .finally(() => setLoading(false));
  }, [id]);

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
        <p className="text-2xl font-bold text-ink">Maqola topilmadi</p>
        <p className="text-muted">U o'chirilgan yoki havola noto'g'ri.</p>
        <Link to="/blogs" className="mt-2 h-11 px-5 inline-flex items-center rounded-full border border-line font-semibold hover:border-ink">
          Barcha maqolalar
        </Link>
      </div>
    );
  }

  return (
    <main className="pt-12 sm:pt-16 pb-28">
      <article className="max-w-[44rem] mx-auto px-5 sm:px-8">
        <Link to="/blogs" className="inline-flex items-center gap-2 text-[15px] text-muted hover:text-ink">
          <HiOutlineArrowLeft /> Blog
        </Link>
        <h1 className="mt-8 text-4xl sm:text-5xl font-extrabold tracking-[-0.04em] leading-[1.08] text-ink text-balance">{blog.title}</h1>
        <p className="mt-6 text-[15px] text-muted">
          {formatDate(blog.createdAt)}, {readTime(blog.text)} daqiqa o'qish
          {blog.tags.length ? `. ${blog.tags.join(", ")}` : ""}
        </p>
      </article>
      {blog.image && (
        <div className="max-w-5xl mx-auto px-5 sm:px-8 mt-10">
          <img src={mediaUrl(blog.image)} alt="" className="w-full aspect-[16/9] object-cover rounded-[22px] border border-line" />
        </div>
      )}
      <div className="max-w-[44rem] mx-auto px-5 sm:px-8 mt-12">
        {blog.text
          .split("\n")
          .filter((p) => p.trim())
          .map((p, i) => (
            <p key={i} className="text-lg leading-[1.75] text-ink-2 mb-6">
              {p}
            </p>
          ))}
      </div>
    </main>
  );
}
