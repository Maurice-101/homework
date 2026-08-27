import SectionHeading from "../ui/SectionHeading";
import { LEADERSHIP } from "../../data/siteData";

const PORTRAITS = [
  "../../assets/Kayinamura_vii.jpeg",
  "../../assets/bode_viii.jpeg",
  "../../assets/Maurice_vii.jpeg",
];

export default function Leadership() {
  return (
    <section className="py-20 sm:py-24 bg-cream-50">
      <div className="container-page">
        <SectionHeading align="left" title="Leadership & governance" />
        <div className="mt-12 grid gap-8 sm:grid-cols-3">
          {LEADERSHIP.map((person, i) => (
            <div key={person.name}>
              <div className="aspect-[4/5] w-full overflow-hidden rounded-2xl bg-navy-900/5">
                <img
                  src={PORTRAITS[i]}
                  alt=""
                  className="h-full w-full object-cover grayscale hover:grayscale-0 transition-all duration-500"
                />
              </div>
              <h3 className="mt-4 font-semibold">{person.name}</h3>
              <p className="text-sm font-medium text-gold-600">{person.role}</p>
              <p className="mt-1.5 text-sm text-slate-ink/70 leading-relaxed">{person.bio}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
