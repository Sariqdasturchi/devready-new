import { Link } from "react-router-dom";
import { FaTelegramPlane } from "react-icons/fa";
import Logo from "../Logo";
import { BOT_USERNAME, SUPPORT_USERNAME } from "../../lib/constants";

const groups = [
  {
    title: "Platforma",
    links: [
      { name: "Qanday ishlaydi", to: "/#how" },
      { name: "Narxlar", to: "/pricing" },
      { name: "Blog", to: "/blogs" },
    ],
  },
  {
    title: "Hamjamiyat",
    links: [
      { name: "Mentor bo'lish", to: "/mentors" },
      { name: "Ro'yxatdan o'tish", to: "/register" },
      { name: "Kirish", to: "/login" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="bg-mist border-t border-line text-ink">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 pt-16 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
          <div className="md:col-span-6 flex flex-col gap-5">
            <Logo />
            <p className="text-ink-2 leading-relaxed max-w-sm">
              Amaliy tasklar, vaqt va mentor tekshiruvi orqali dasturchilarni real loyihalar va texnik suhbatga tayyorlaymiz.
            </p>
            <div className="flex flex-wrap gap-2">
              <a
                href={`https://t.me/${BOT_USERNAME}`}
                target="_blank"
                rel="noreferrer"
                className="h-10 px-4 inline-flex items-center gap-2 rounded-full bg-brand text-white hover:bg-brand-deep text-sm font-medium transition-colors"
              >
                <FaTelegramPlane /> @{BOT_USERNAME}
              </a>
              <a
                href={`https://t.me/${SUPPORT_USERNAME}`}
                target="_blank"
                rel="noreferrer"
                className="h-10 px-4 inline-flex items-center rounded-full border border-line bg-surface hover:border-ink text-sm font-medium transition-colors"
              >
                Yordam: @{SUPPORT_USERNAME}
              </a>
            </div>
          </div>
          {groups.map((g) => (
            <div key={g.title} className="md:col-span-3">
              <p className="text-sm font-semibold text-ink">{g.title}</p>
              <ul className="mt-4 flex flex-col gap-3">
                {g.links.map((l) => (
                  <li key={l.name}>
                    <Link to={l.to} className="text-ink-2 hover:text-brand transition-colors">
                      {l.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-14 pt-6 border-t border-line flex flex-col sm:flex-row justify-between gap-2 text-sm text-muted">
          <p>© {new Date().getFullYear()} DevReady</p>
          <p>Samarqand, O'zbekiston</p>
        </div>
      </div>
    </footer>
  );
}
