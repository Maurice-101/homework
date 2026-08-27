import { useEffect } from "react";
import ContactHero from "../components/contact/ContactHero";
import ContactForm from "../components/contact/ContactForm";
import ContactHub from "../components/contact/ContactHub";
import Partners from "../components/contact/Partners";

export default function Contact() {
  useEffect(() => {
    document.title = "Contact — Abahizi";
  }, []);

  return (
    <>
      <ContactHero />
      <section className="container-page py-16 sm:py-20">
        <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr] items-start">
          <ContactForm />
          <ContactHub />
        </div>
      </section>
      <Partners />
    </>
  );
}
