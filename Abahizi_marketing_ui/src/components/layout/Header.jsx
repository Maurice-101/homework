import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Menu, X, Search } from "lucide-react";
import Logo from "./Logo";
import Button from "../ui/Button";
import { NAV_LINKS } from "../../data/siteData";

export default function Header() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  // Close the mobile menu whenever the route changes.
  useEffect(() => setOpen(false), [location.pathname]);

  // Lock body scroll while the mobile menu is open.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-navy-900/5">
      <div className="container-page flex h-16 sm:h-20 items-center justify-between gap-4">
        <Logo />

        <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-navy-900/80">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.label}
              to={link.to}
              className={({ isActive }) =>
                `transition-colors hover:text-navy-900 ${
                  isActive ? "text-navy-900 font-semibold" : ""
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-3">
          <button
            type="button"
            aria-label="Search"
            className="p-2 rounded-full text-navy-900/70 hover:bg-navy-900/5 transition-colors"
          >
            <Search size={18} />
          </button>
          <Link
            to="/login"
            className="text-sm font-semibold text-navy-900/80 hover:text-navy-900 px-3 py-2"
          >
            Log In
          </Link>
          <Button to="/contact" size="md">
            Request Demo
          </Button>
        </div>

        <button
          type="button"
          className="lg:hidden p-2 -mr-2 text-navy-900"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={26} /> : <Menu size={26} />}
        </button>
      </div>

      {/* Mobile menu */}
      <div
        className={`lg:hidden fixed inset-x-0 top-16 sm:top-20 bottom-0 bg-white transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full pointer-events-none"
        }`}
      >
        <nav className="flex flex-col gap-1 p-6">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.label}
              to={link.to}
              className={({ isActive }) =>
                `rounded-lg px-4 py-3 text-lg font-medium ${
                  isActive ? "bg-navy-900/5 text-navy-900" : "text-navy-900/80"
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
          <div className="mt-4 flex flex-col gap-3 border-t border-navy-900/10 pt-4">
            <Link
              to="/login"
              className="px-4 py-3 text-lg font-medium text-navy-900/80"
            >
              Log In
            </Link>
            <Button to="/contact" size="lg" className="justify-center">
              Request Demo
            </Button>
          </div>
        </nav>
      </div>
    </header>
  );
}
