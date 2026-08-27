import { useEffect } from "react";
import Button from "../components/ui/Button";

export default function NotFound() {
  useEffect(() => {
    document.title = "Page not found — Abahizi";
  }, []);

  return (
    <section className="container-page py-28 text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold-600">404</p>
      <h1 className="mt-3 text-3xl sm:text-4xl font-semibold">We couldn't find that page</h1>
      <p className="mt-3 text-slate-ink/70 max-w-md mx-auto">
        The page you're looking for may have been moved or no longer exists.
      </p>
      <div className="mt-8">
        <Button to="/">Back to homepage</Button>
      </div>
    </section>
  );
}
