import { ArrowRight } from "lucide-react";
import Button from "../ui/Button";
import { SYSTEM_STATUS } from "../../data/siteData";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-navy-900">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-40"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=1600&q=80')",
        }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-navy-900 via-navy-900/70 to-navy-900/30" />

      <div className="container-page relative py-20 sm:py-28 lg:py-32">
        <div className="max-w-2xl">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold text-white leading-[1.05]">
            The classroom, extended.
          </h1>
          <p className="mt-6 text-lg text-white/75 leading-relaxed max-w-xl">
            Empowering Rwandan excellence through premium digital infrastructure designed for
            serious academic administration.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Button to="/contact" size="lg">
              Request Demo
            </Button>
            <Button to="/solutions" size="lg" variant="outline" icon={ArrowRight}>
              Explore Platform
            </Button>
          </div>
        </div>

        <div className="mt-14 lg:mt-0 lg:absolute lg:right-10 lg:bottom-[-2.5rem] w-full max-w-xs rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 p-6 shadow-[var(--shadow-soft)]">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-400">
            System Status
          </p>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between text-white/80">
              <dt>Active Institutes</dt>
              <dd className="font-semibold text-white">{SYSTEM_STATUS.activeInstitutes}</dd>
            </div>
            <div className="flex items-center justify-between text-white/80">
              <dt>Daily Syncs</dt>
              <dd className="font-semibold text-white">{SYSTEM_STATUS.dailySyncs}</dd>
            </div>
          </dl>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-400/15 px-3 py-1.5 text-xs font-medium text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            {SYSTEM_STATUS.status}
          </div>
        </div>
      </div>
    </section>
  );
}
