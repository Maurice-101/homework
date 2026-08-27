import SectionHeading from "../ui/SectionHeading";
import FeatureCard from "../ui/FeatureCard";
import { CORE_VALUES } from "../../data/siteData";

export default function ValueProps() {
  return (
    <section className="py-20 sm:py-24 bg-cream-50">
      <div className="container-page">
        <SectionHeading
          title="Digital enhancement, not replacement"
          description="We believe technology should serve educators, not supplant them. Abahizi provides the structural rigor required for modern administration while preserving the human element of teaching."
        />
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {CORE_VALUES.map((item) => (
            <FeatureCard key={item.title} variant="navy" {...item} />
          ))}
        </div>
      </div>
    </section>
  );
}
