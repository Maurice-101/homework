import SectionHeading from "../ui/SectionHeading";
import Icon from "../ui/Icon";
import { PARTNERS } from "../../data/siteData";

export default function Partners() {
  return (
    <section id="partners" className="py-20 sm:py-24 bg-cream-50">
      <div className="container-page">
        <SectionHeading
          title="Our partners & funders"
          description="We are proud to collaborate with leading organizations dedicated to elevating educational standards and administrative excellence in Rwanda."
        />
        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {PARTNERS.map((p) => (
            <div key={p.title} className="rounded-2xl bg-white border border-navy-900/10 p-7">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-navy-900/5 text-navy-900">
                <Icon name={p.icon} size={20} />
              </div>
              <h3 className="mt-5 text-lg font-semibold">{p.title}</h3>
              <p className="mt-2.5 text-sm text-slate-ink/70 leading-relaxed">{p.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
