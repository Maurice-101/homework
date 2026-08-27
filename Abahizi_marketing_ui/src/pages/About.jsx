import { useEffect } from "react";
import AboutHero from "../components/about/AboutHero";
import Approach from "../components/about/Approach";
import ImpactStats from "../components/about/ImpactStats";
import Leadership from "../components/about/Leadership";

export default function About() {
  useEffect(() => {
    document.title = "About Platform — Abahizi";
  }, []);

  return (
    <>
      <AboutHero />
      <Approach />
      <ImpactStats />
      <Leadership />
    </>
  );
}
