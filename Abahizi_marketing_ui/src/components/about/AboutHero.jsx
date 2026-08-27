import { Target, Eye } from "lucide-react";

export default function AboutHero() {
  return (
    <section className="bg-cream-100">
      <div className="container-page py-16 sm:py-20">
        <div className="grid gap-10 lg:grid-cols-2 items-center">
          <div>
            <h1 className="text-4xl sm:text-5xl font-semibold leading-[1.1]">
              Empowering Rwandan excellence through{" "}
              <span className="text-gold-600">innovation</span>.
            </h1>
            <p className="mt-6 text-lg text-slate-ink/70 max-w-lg leading-relaxed">
              Abahizi is more than a platform; it's a commitment to elevating academic
              administration and fostering an environment of technical precision and
              institutional authority.
            </p>
          </div>
          <div className="rounded-2xl overflow-hidden shadow-[var(--shadow-soft)]">
            <img
              src="https://i.guim.co.uk/img/static/sys-images/Environment/Pix/columnists/2013/3/14/1363265775426/MDG--South-African-studen-009.jpg?width=620&dpr=1&s=none"
              alt="Students collaborating around a laptop"
              className="w-full h-72 sm:h-96 object-cover"
            />
          </div>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          <div className="rounded-2xl bg-white border border-navy-900/10 p-8">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-navy-900/5 text-navy-900">
              <Target size={22} />
            </div>
            <h2 className="mt-5 text-xl font-semibold">Our Mission</h2>
            <p className="mt-2.5 text-sm text-slate-ink/70 leading-relaxed">
              To streamline complex educational data into actionable insights, providing
              educators and administrators with a high-end tool that feels as capable as a
              financial terminal, tailored for the unique needs of the academic sector.
            </p>
          </div>
          <div className="rounded-2xl bg-navy-900 text-white p-8">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-gold-400">
              <Eye size={22} />
            </div>
            <h2 className="mt-5 text-xl font-semibold text-white">Our Vision</h2>
            <p className="mt-2.5 text-sm text-white/70 leading-relaxed">
              A future where digital quiet replaces administrative noise, allowing
              high-achieving students and dedicated educators to focus entirely on academic
              excellence and research integration.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
