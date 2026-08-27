import { ArrowRight, Users, Landmark } from "lucide-react";
import { Link } from "react-router-dom";

export default function Ecosystem() {
  return (
    <section className="py-20 sm:py-24 bg-white">
      <div className="container-page">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h2 className="text-3xl sm:text-4xl font-semibold">The Abahizi ecosystem</h2>
            <p className="mt-3 text-slate-ink/70 max-w-xl">
              A cohesive suite of tools architected for total institutional management.
            </p>
          </div>
          <Link
            to="/solutions"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy-900 hover:text-gold-600 transition-colors shrink-0"
          >
            View Full Architecture <ArrowRight size={16} />
          </Link>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-2xl bg-cream-100 p-8 flex flex-col justify-between">
            <div>
              <span className="inline-block rounded-full bg-white px-3 py-1 text-xs font-semibold text-navy-900/70">
                Core Module
              </span>
              <h3 className="mt-4 text-2xl font-semibold">Academic Terminal</h3>
              <p className="mt-3 text-sm text-slate-ink/70 leading-relaxed max-w-md">
                The central hub for educators to manage curriculum, track progress, and interface
                with administrative directives in real-time.
              </p>
            </div>
            <div className="mt-8 rounded-xl bg-navy-900 p-5 text-white/80 text-xs">
              <div className="flex items-center gap-2 font-semibold text-white">
                <span className="h-2 w-2 rounded-full bg-gold-500" /> Abahizi Academic Terminal
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="h-16 rounded-lg bg-white/10" />
                <div className="h-16 rounded-lg bg-white/10" />
                <div className="h-16 rounded-lg bg-white/10" />
              </div>
            </div>
          </div>

          <div className="grid gap-6">
            <div className="rounded-2xl bg-navy-900 text-white p-7 flex-1">
              <Users className="text-gold-400" size={22} />
              <h3 className="mt-4 text-xl font-semibold">Student Portal</h3>
              <p className="mt-2 text-sm text-white/70 leading-relaxed">
                Secure access to assignments, grades, and resources for empowered learning.
              </p>
            </div>
            <div className="rounded-2xl bg-gold-500 text-navy-900 p-7 flex-1">
              <Landmark size={22} />
              <h3 className="mt-4 text-xl font-semibold">Admin Console</h3>
              <p className="mt-2 text-sm text-navy-900/75 leading-relaxed">
                High-level oversight tools for school leadership and district managers.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
