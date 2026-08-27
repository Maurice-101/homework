import { Link } from "react-router-dom";

const VARIANTS = {
  primary:
    "bg-gold-500 text-navy-900 hover:bg-gold-600 focus-visible:bg-gold-600 shadow-[0_10px_25px_-10px_rgba(232,185,79,0.7)]",
  outline:
    "bg-transparent text-white border border-white/60 hover:bg-white/10",
  outlineNavy:
    "bg-transparent text-navy-900 border border-navy-900/30 hover:bg-navy-900/5",
  ghostNavy: "bg-white/10 text-white hover:bg-white/20",
};

const SIZES = {
  md: "px-5 py-2.5 text-sm",
  lg: "px-6 py-3.5 text-base",
};

/**
 * Button renders as a react-router <Link> when `to` is provided,
 * an <a> when `href` is provided, or a native <button> otherwise.
 */
export default function Button({
  children,
  to,
  href,
  variant = "primary",
  size = "md",
  icon: Icon,
  className = "",
  ...rest
}) {
  const classes = `inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-200 whitespace-nowrap ${VARIANTS[variant]} ${SIZES[size]} ${className}`;

  const content = (
    <>
      {children}
      {Icon ? <Icon size={18} strokeWidth={2.25} /> : null}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={classes} {...rest}>
        {content}
      </Link>
    );
  }

  if (href) {
    return (
      <a href={href} className={classes} {...rest}>
        {content}
      </a>
    );
  }

  return (
    <button type="button" className={classes} {...rest}>
      {content}
    </button>
  );
}
