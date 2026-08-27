import { useEffect } from "react";
import Hero from "../components/home/Hero";
import ValueProps from "../components/home/ValueProps";
import Ecosystem from "../components/home/Ecosystem";
import TrustedBy from "../components/home/TrustedBy";

export default function Home() {
  useEffect(() => {
    document.title = "Abahizi — The Classroom, Extended";
  }, []);

  return (
    <>
      <Hero />
      <ValueProps />
      <Ecosystem />
      <TrustedBy />
    </>
  );
}
