import SectionHeading from "../ui/SectionHeading";
import { WORKFLOW_STEPS } from "../../data/siteData";

const DOT_COLORS = ["bg-navy-800", "bg-gold-500", "bg-emerald-700"];

export default function Workflow() {
  return (
    <section id="levels" className="py-20 sm:py-24 bg-white">
      <div className="container-page">
        <SectionHeading
          title="Seamless implementation workflow"
          description="From setup to daily use, our platform is designed for rapid adoption and sustained impact."
        />
        <div className="mt-14 grid gap-6 sm:grid-cols-3">
          {WORKFLOW_STEPS.map((step, i) => (
            <div
              key={step.number}
              className="rounded-2xl border border-navy-900/10 p-7 text-center"
            >
              <span
                className={`mx-auto mb-5 flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-white ${DOT_COLORS[i % DOT_COLORS.length]}`}
              >
                {step.number}
              </span>
              <h3 className="text-lg font-semibold">{step.title}</h3>
              <p className="mt-2.5 text-sm text-slate-ink/70 leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
