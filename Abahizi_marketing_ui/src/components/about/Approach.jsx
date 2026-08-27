import SectionHeading from "../ui/SectionHeading";
import Icon from "../ui/Icon";
import { APPROACH_PILLARS } from "../../data/siteData";

export default function Approach() {
  return (
    <section className="py-20 sm:py-24 bg-cream-50">
      <div className="container-page">
        <SectionHeading
          title="The Abahizi approach"
          description="A holistic methodology integrating the classroom experience, teacher empowerment, and cutting-edge technology."
        />
        <div className="mt-14 grid gap-10 lg:grid-cols-2 items-center">
          <div className="rounded-2xl overflow-hidden shadow-[var(--shadow-soft)] order-2 lg:order-1">
            <img
              src="https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=900&q=80"
              alt="Student conducting a science experiment in a lab"
              className="w-full h-80 sm:h-[26rem] object-cover"
            />
          </div>
          <ul className="space-y-8 order-1 lg:order-2">
            {APPROACH_PILLARS.map((pillar) => (
              <li key={pillar.title} className="flex gap-4">
                <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-navy-900/5 text-navy-900">
                  <Icon name={pillar.icon} size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{pillar.title}</h3>
                  <p className="mt-1.5 text-sm text-slate-ink/70 leading-relaxed">
                    {pillar.description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
