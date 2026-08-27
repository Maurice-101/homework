import { MapPin, Phone, Mail } from "lucide-react";
import { CONTACT_INFO } from "../../data/siteData";

export default function ContactHub() {
  return (
    <div className="rounded-3xl bg-white border border-navy-900/10 overflow-hidden">
      <iframe
        title="Abahizi Kigali Hub location"
        src="https://www.google.com/maps?q=Kigali,Rwanda&output=embed"
        className="h-52 w-full border-0"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />

      <div className="p-7">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-navy-900">
          <MapPin size={18} className="text-gold-600" />
          {CONTACT_INFO.hub}
        </h3>
        <p className="mt-2 text-sm text-slate-ink/70 leading-relaxed">
          {CONTACT_INFO.description}
        </p>

        <ul className="mt-5 space-y-3 text-sm">
          <li className="flex items-start gap-2.5 text-slate-ink/80">
            <MapPin size={16} className="mt-0.5 shrink-0 text-navy-900/50" />
            {CONTACT_INFO.address}
          </li>
          <li className="flex items-center gap-2.5 text-slate-ink/80">
            <Phone size={16} className="shrink-0 text-navy-900/50" />
            <a href={`tel:${CONTACT_INFO.phone.replace(/[^+\d]/g, "")}`} className="hover:text-navy-900">
              {CONTACT_INFO.phone}
            </a>
          </li>
          <li className="flex items-center gap-2.5 text-slate-ink/80">
            <Mail size={16} className="shrink-0 text-navy-900/50" />
            <a href={`mailto:${CONTACT_INFO.email}`} className="hover:text-navy-900">
              {CONTACT_INFO.email}
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
}
