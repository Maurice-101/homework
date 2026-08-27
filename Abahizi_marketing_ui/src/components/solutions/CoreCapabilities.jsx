import { FileText, ArrowRight } from "lucide-react";
import Icon from "../ui/Icon";
import { CORE_CAPABILITIES } from "../../data/siteData";

export default function CoreCapabilities() {
  return (
    <section className="py-20 sm:py-24 bg-cream-50">
      <div className="container-page">
        <h2 className="text-3xl sm:text-4xl font-semibold">Core capabilities</h2>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {CORE_CAPABILITIES.map((cap) => {
            const isNavy = cap.variant === "navy";
            return (
              <div
                key={cap.key}
                className={`rounded-2xl p-7 ${
                  cap.key === "quizzes" ? "lg:col-span-2" : ""
                } ${
                  isNavy
                    ? "bg-navy-900 text-white"
                    : "bg-white border border-navy-900/10 text-navy-900"
                }`}
              >
                <div
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${
                    isNavy ? "bg-white/10 text-gold-400" : "bg-navy-900/5 text-navy-900"
                  }`}
                >
                  <Icon name={cap.icon} size={20} />
                </div>
                <h3 className="mt-4 text-xl font-semibold">{cap.title}</h3>
                <p
                  className={`mt-2.5 text-sm leading-relaxed ${
                    isNavy ? "text-white/70" : "text-slate-ink/70"
                  }`}
                >
                  {cap.description}
                </p>

                {cap.bullets ? (
                  <ul className="mt-4 space-y-2">
                    {cap.bullets.map((b) => (
                      <li key={b} className="flex items-center gap-2 text-sm text-slate-ink/70">
                        <span className="h-1.5 w-1.5 rounded-full bg-gold-600" />
                        {b}
                      </li>
                    ))}
                  </ul>
                ) : null}

                {cap.file ? (
                  <div className="mt-5 flex items-center justify-between rounded-xl border border-navy-900/10 bg-cream-50 px-4 py-3 text-sm">
                    <span className="flex items-center gap-2 text-navy-900/80">
                      <FileText size={16} /> {cap.file.name}
                    </span>
                    <span className="text-navy-900/40">{cap.file.size}</span>
                  </div>
                ) : null}

                {cap.link ? (
                  <button
                    type="button"
                    className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-gold-400 hover:text-gold-300 transition-colors"
                  >
                    {cap.link} <ArrowRight size={15} />
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
