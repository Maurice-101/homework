import { Link } from "react-router-dom";
import logo from "../../assets/logo.jpeg";

/**
 * Brand logo. Always links back to "/" and is keyboard accessible.
 * `variant="mark"` renders a compact square crop (e.g. for a footer or
 * favicon-style use); default renders the full lockup used in the header.
 */
export default function Logo({ className = "", imgClassName = "" }) {
  return (
    <Link
      to="/"
      aria-label="Abahizi — go to homepage"
      className={`group inline-flex items-center gap-2 rounded-lg transition-opacity hover:opacity-90 ${className}`}
    >
      <img
        src={logo}
        alt="Abahizi logo"
        className={`h-10 sm:h-11 w-auto object-contain rounded-md ${imgClassName}`}
      />
    </Link>
  );
}
