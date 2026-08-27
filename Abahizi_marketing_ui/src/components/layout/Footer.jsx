import { Link } from "react-router-dom";
import Logo from "./Logo";
import { FOOTER_LINKS } from "../../data/siteData";

export default function Footer() {
  return (
    <footer className="bg-navy-900 text-white">
      <div className="container-page py-14 grid gap-10 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
        <div>
          <Logo imgClassName="ring-1 ring-white/10" />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/60">
            Building the digital foundation for academic excellence in Rwanda.
          </p>
        </div>

        {Object.entries(FOOTER_LINKS).map(([heading, links]) => (
          <div key={heading}>
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-400">
              {heading}
            </h3>
            <ul className="mt-4 space-y-2.5">
              {links.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.to}
                    className="text-sm text-white/70 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-white/10">
        <div className="container-page py-5 text-xs text-white/50">
          © {new Date().getFullYear()} Abahizi Education. Empowering Rwandan Excellence. All
          rights reserved.
        </div>
      </div>
    </footer>
  );
}
