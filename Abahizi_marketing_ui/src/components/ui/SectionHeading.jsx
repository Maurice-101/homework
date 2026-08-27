export default function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  light = false,
}) {
  const alignment = align === "center" ? "text-center mx-auto" : "text-left";

  return (
    <div className={`max-w-2xl ${alignment}`}>
      {eyebrow ? (
        <p
          className={`mb-3 text-xs font-semibold uppercase tracking-[0.2em] ${
            light ? "text-gold-400" : "text-navy-600"
          }`}
        >
          {eyebrow}
        </p>
      ) : null}
      <h2
        className={`text-3xl sm:text-4xl font-semibold ${
          light ? "text-white" : "text-navy-900"
        }`}
      >
        {title}
      </h2>
      {description ? (
        <p
          className={`mt-4 text-base sm:text-lg leading-relaxed ${
            light ? "text-white/75" : "text-slate-ink/70"
          }`}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}
