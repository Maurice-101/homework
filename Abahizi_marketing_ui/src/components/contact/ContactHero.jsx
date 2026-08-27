export default function ContactHero() {
  return (
    <section className="container-page pt-10 sm:pt-14">
      <div className="relative overflow-hidden rounded-3xl">
        <img
          src="https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=1600&q=80"
          alt="Abahizi partner campus building"
          className="h-64 sm:h-80 w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-900/90 via-navy-900/40 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-end p-8 sm:p-12">
          <h1 className="text-3xl sm:text-4xl font-semibold text-white max-w-lg">
            Connect with excellence
          </h1>
          <p className="mt-3 max-w-xl text-white/80 text-sm sm:text-base leading-relaxed">
            Whether you're looking to partner with us or bring our platform to your institution,
            our team is ready to support Rwandan educational advancement.
          </p>
        </div>
      </div>
    </section>
  );
}
