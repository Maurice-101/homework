import { useState } from "react";
import { ChevronDown, CheckCircle2 } from "lucide-react";
import { INQUIRY_TOPICS } from "../../data/siteData";

const initialForm = {
  topic: "",
  firstName: "",
  lastName: "",
  organization: "",
  email: "",
  message: "",
};

function validate(form) {
  const errors = {};
  if (!form.topic) errors.topic = "Please select a topic.";
  if (!form.firstName.trim()) errors.firstName = "First name is required.";
  if (!form.lastName.trim()) errors.lastName = "Last name is required.";
  if (!form.organization.trim()) errors.organization = "Institution or organization is required.";
  if (!/^\S+@\S+\.\S+$/.test(form.email)) errors.email = "Enter a valid work email.";
  if (!form.message.trim()) errors.message = "Tell us a bit about how we can help.";
  return errors;
}

export default function ContactForm() {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle"); // idle | submitting | success

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setStatus("submitting");
    // Simulated submission — swap for a real API call (fetch/axios) when ready.
    setTimeout(() => {
      setStatus("success");
      setForm(initialForm);
    }, 900);
  }

  if (status === "success") {
    return (
      <div className="rounded-3xl bg-white border border-navy-900/10 p-10 flex flex-col items-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <CheckCircle2 size={28} />
        </div>
        <h2 className="mt-5 text-2xl font-semibold">Inquiry sent</h2>
        <p className="mt-2 text-slate-ink/70 max-w-sm">
          Thank you for reaching out. A member of our team will respond to your inquiry within
          one business day.
        </p>
        <button
          type="button"
          onClick={() => setStatus("idle")}
          className="mt-6 text-sm font-semibold text-navy-900 underline underline-offset-4"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="rounded-3xl bg-white border border-navy-900/10 p-7 sm:p-9"
    >
      <h2 className="text-2xl font-semibold">Get in touch</h2>

      <div className="mt-6 space-y-5">
        <Field label="Inquiry Type" error={errors.topic}>
          <div className="relative">
            <select
              value={form.topic}
              onChange={update("topic")}
              className="w-full appearance-none rounded-xl border border-navy-900/15 bg-cream-50 px-4 py-3 text-sm text-navy-900 focus:border-navy-900/40 focus:outline-none"
            >
              <option value="">Select a topic...</option>
              {INQUIRY_TOPICS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <ChevronDown
              size={16}
              className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-navy-900/40"
            />
          </div>
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="First Name" error={errors.firstName}>
            <input
              type="text"
              placeholder="Jane"
              value={form.firstName}
              onChange={update("firstName")}
              className="w-full rounded-xl border border-navy-900/15 bg-cream-50 px-4 py-3 text-sm placeholder:text-navy-900/35 focus:border-navy-900/40 focus:outline-none"
            />
          </Field>
          <Field label="Last Name" error={errors.lastName}>
            <input
              type="text"
              placeholder="Doe"
              value={form.lastName}
              onChange={update("lastName")}
              className="w-full rounded-xl border border-navy-900/15 bg-cream-50 px-4 py-3 text-sm placeholder:text-navy-900/35 focus:border-navy-900/40 focus:outline-none"
            />
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Institution / Organization" error={errors.organization}>
            <input
              type="text"
              placeholder="University of Rwanda"
              value={form.organization}
              onChange={update("organization")}
              className="w-full rounded-xl border border-navy-900/15 bg-cream-50 px-4 py-3 text-sm placeholder:text-navy-900/35 focus:border-navy-900/40 focus:outline-none"
            />
          </Field>
          <Field label="Work Email" error={errors.email}>
            <input
              type="email"
              placeholder="jane@institution.edu"
              value={form.email}
              onChange={update("email")}
              className="w-full rounded-xl border border-navy-900/15 bg-cream-50 px-4 py-3 text-sm placeholder:text-navy-900/35 focus:border-navy-900/40 focus:outline-none"
            />
          </Field>
        </div>

        <Field label="Message" error={errors.message}>
          <textarea
            rows={4}
            placeholder="How can we collaborate?"
            value={form.message}
            onChange={update("message")}
            className="w-full resize-none rounded-xl border border-navy-900/15 bg-cream-50 px-4 py-3 text-sm placeholder:text-navy-900/35 focus:border-navy-900/40 focus:outline-none"
          />
        </Field>
      </div>

      <div className="mt-7 flex justify-end">
        <button
          type="submit"
          disabled={status === "submitting"}
          className="inline-flex items-center justify-center rounded-full bg-gold-500 px-6 py-3 text-sm font-semibold text-navy-900 transition-colors hover:bg-gold-600 disabled:opacity-60"
        >
          {status === "submitting" ? "Sending..." : "Submit Inquiry"}
        </button>
      </div>
    </form>
  );
}

function Field({ label, error, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-navy-900">{label}</span>
      {children}
      {error ? <span className="mt-1.5 block text-xs text-red-600">{error}</span> : null}
    </label>
  );
}
