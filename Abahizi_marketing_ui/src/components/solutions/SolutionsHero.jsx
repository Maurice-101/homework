import Button from "../ui/Button";

export default function SolutionsHero() {
  return (
    <section className="bg-cream-100">
      <div className="container-page py-16 sm:py-20 grid gap-10 lg:grid-cols-2 items-center">
        <div>
          <h1 className="text-4xl sm:text-5xl font-semibold leading-[1.1]">
            Empowering Rwandan excellence through digital solutions.
          </h1>
          <p className="mt-6 text-lg text-slate-ink/70 max-w-lg leading-relaxed">
            A comprehensive, enterprise-grade platform designed to streamline school
            administration, empower teachers with powerful tools, and foster deep student
            engagement.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Button to="/contact" size="lg">
              Get Started for Schools
            </Button>
            <Button to="/resources" size="lg" variant="outlineNavy">
              View Documentation
            </Button>
          </div>
        </div>
        <div className="rounded-2xl overflow-hidden shadow-[var(--shadow-soft)]">
          <img
            src="https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=900&q=80"
            alt="Student using a tablet in a Rwandan classroom"
            className="w-full h-72 sm:h-96 object-cover"
          />
        </div>
      </div>
    </section>
  );
}
