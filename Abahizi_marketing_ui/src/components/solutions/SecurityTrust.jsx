import Icon from "../ui/Icon";
import { SECURITY_FEATURES } from "../../data/siteData";

export default function SecurityTrust() {
  return (
    <section id="security" className="py-20 sm:py-24 bg-navy-950 text-white">
      <div className="container-page grid gap-12 lg:grid-cols-2 items-center">
        <div>
          <h2 className="text-3xl sm:text-4xl font-semibold text-white">
            Enterprise-grade security &amp; trust
          </h2>
          <p className="mt-5 text-white/70 leading-relaxed max-w-lg">
            We understand that academic data is highly sensitive. Our platform is built on a
            robust, compliant infrastructure ensuring that student records, assessments, and
            institutional data remain secure and private.
          </p>
          <ul className="mt-8 space-y-6">
            {SECURITY_FEATURES.map((f) => (
              <li key={f.title} className="flex gap-4">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-gold-400">
                  <Icon name={f.icon} size={18} />
                </div>
                <div>
                  <h3 className="font-semibold text-white">{f.title}</h3>
                  <p className="mt-1 text-sm text-white/60 leading-relaxed">{f.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl bg-white/5 border border-white/10 p-3">
          <img
            src="https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=900&q=80"
            alt="Secure server infrastructure illustration"
            className="w-full h-72 sm:h-96 object-cover rounded-xl opacity-90"
          />
        </div>
      </div>
    </section>
  );
}
