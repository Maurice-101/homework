import { TRUSTED_BY } from "../../data/siteData";

export default function TrustedBy() {
  return (
    <section className="bg-cream-100 py-12 border-y border-navy-900/5">
      <div className="container-page">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.25em] text-navy-900/50">
          Trusted by leading academic institutions &amp; partners
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-x-12 gap-y-4">
          {TRUSTED_BY.map((name) => (
            <span
              key={name}
              className="text-sm sm:text-base font-semibold text-navy-900/40 tracking-wide"
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
