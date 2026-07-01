import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "../components/landing/Navbar";
import { HeroSection } from "../components/landing/HeroSection";
import { ProblemSection } from "../components/landing/ProblemSection";
import { SolutionSection } from "../components/landing/SolutionSection";
import { DemoValueSection } from "../components/landing/DemoValueSection";
import { HowItWorksSection } from "../components/landing/HowItWorksSection";
import { PricingSection } from "../components/landing/PricingSection";
import { CTAFinalSection } from "../components/landing/CTAFinalSection";
import { FooterSection } from "../components/landing/FooterSection";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <ProblemSection />
      <SolutionSection />
      <DemoValueSection />
      <HowItWorksSection />
      <PricingSection />
      <CTAFinalSection />
      <FooterSection />
    </div>
  );
}
