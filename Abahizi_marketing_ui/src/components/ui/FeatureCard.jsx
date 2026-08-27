import Icon from "./Icon";

const VARIANT_STYLES = {
  light: "bg-white text-navy-900 border border-navy-900/10",
  navy: "bg-navy-900 text-white",
  gold: "bg-gold-500 text-navy-900",
};

const ICON_WRAP_STYLES = {
  light: "bg-navy-900/5 text-navy-900",
  navy: "bg-white/10 text-gold-400",
  gold: "bg-navy-900/10 text-navy-900",
};

export default function FeatureCard({
  icon,
  title,
  description,
  variant = "light",
  children,
  className = "",
}) {
  return (
    <div
      className={`rounded-2xl p-7 shadow-[var(--shadow-card)] transition-transform duration-300 hover:-translate-y-1 ${VARIANT_STYLES[variant]} ${className}`}
    >
      {icon ? (
        <div
          className={`mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl ${ICON_WRAP_STYLES[variant]}`}
        >
          <Icon name={icon} size={22} />
        </div>
      ) : null}
      <h3 className="text-lg font-semibold font-display">{title}</h3>
      <p
        className={`mt-2.5 text-sm leading-relaxed ${
          variant === "navy" ? "text-white/70" : "text-slate-ink/70"
        }`}
      >
        {description}
      </p>
      {children}
    </div>
  );
}
