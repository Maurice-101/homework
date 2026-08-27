import { IMPACT_STATS } from "../../data/siteData";

export default function ImpactStats() {
  return (
    <section className="py-20 sm:py-24 bg-white">
      <div className="container-page">
        <h2 className="text-3xl sm:text-4xl font-semibold text-center">
          Impact by the numbers
        </h2>
        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {IMPACT_STATS.map((stat) => {
            const isNavy = stat.variant === "navy";
            return (
              <div
                key={stat.label}
                className={`rounded-2xl p-8 text-center ${
                  isNavy
                    ? "bg-navy-900 text-white"
                    : "bg-cream-100 text-navy-900"
                }`}
              >
                <p
                  className={`text-4xl sm:text-5xl font-semibold font-display ${
                    isNavy ? "text-gold-400" : "text-gold-600"
                  }`}
                >
                  {stat.value}
                </p>
                <p className="mt-2 font-semibold">{stat.label}</p>
                <p
                  className={`mt-1.5 text-sm ${
                    isNavy ? "text-white/60" : "text-slate-ink/60"
                  }`}
                >
                  {stat.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
