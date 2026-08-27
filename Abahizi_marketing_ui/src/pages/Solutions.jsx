import { useEffect } from "react";
import SolutionsHero from "../components/solutions/SolutionsHero";
import Workflow from "../components/solutions/Workflow";
import CoreCapabilities from "../components/solutions/CoreCapabilities";
import SecurityTrust from "../components/solutions/SecurityTrust";

export default function Solutions() {
  useEffect(() => {
    document.title = "Solutions — Abahizi";
  }, []);

  return (
    <>
      <SolutionsHero />
      <Workflow />
      <CoreCapabilities />
      <SecurityTrust />
    </>
  );
}
