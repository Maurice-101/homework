# Abahizi — Marketing Website

A responsive, multi-page React application for Abahizi, built from the
provided marketing UI mockup and logo.

## Tech stack

- **React 19** + **Vite** — fast dev server & optimized production build
- **React Router v6** — client-side routing across 4 pages
- **Tailwind CSS v4** — utility-first styling, theme tokens sampled from the mockup
- **lucide-react** — icon set

## Project structure

```
src/
  assets/            Logo image
  components/
    layout/          Header, Footer, Logo (shared across all pages)
    ui/               Button, SectionHeading, FeatureCard, Icon (generic primitives)
    home/             Sections used only on the Home page
    solutions/        Sections used only on the Solutions page
    about/            Sections used only on the About page
    contact/          Sections used only on the Contact page
  data/
    siteData.js       All site copy & structured content, separate from markup
  hooks/
    useScrollToTop.js Scrolls to top (or a #hash target) on route change
  pages/
    Home.jsx, Solutions.jsx, About.jsx, Contact.jsx, NotFound.jsx
  App.jsx             Route definitions + shared layout
  main.jsx            App entry point, wraps App in BrowserRouter
  index.css           Tailwind import + design tokens (colors, fonts, shadows)
```

Each page is a thin composition of section components — no page or component
file mixes markup for multiple unrelated sections, and no file mixes
JS/CSS/HTML in a way that fights the framework (Tailwind classes live in JSX,
one‑off tokens live in `index.css`).

## Getting started

```bash
npm install
npm run dev       # start local dev server (http://localhost:5173)
npm run build     # production build to dist/
npm run preview   # preview the production build locally
```

## Notes

- The **logo is clickable** everywhere it appears (header + footer) and
  links back to the homepage, with proper alt text and focus styling for
  accessibility.
- The header collapses into a slide-in mobile menu below the `lg` breakpoint;
  all sections use responsive Tailwind classes and were checked from mobile
  (375px) to wide desktop.
- The contact form (`src/components/contact/ContactForm.jsx`) is fully
  interactive with client-side validation and a simulated submit — replace
  the `setTimeout` in `handleSubmit` with a real API/fetch call when you're
  ready to wire it to a backend.
- `/resources` and `/pricing` are placeholder routes (currently point at the
  Solutions page) since those pages weren't included in the mockup — swap in
  real pages the same way the other four are built.
- Hero/section imagery uses placeholder Unsplash photos — swap the `src`
  URLs in the relevant component files for your own photography.
