import { HeroSection } from "./HeroSection";
import { AboutSection } from "./AboutSection";
import { ApproachSection } from "./ApproachSection";
import { PhilosophySection } from "./PhilosophySection";
import { ServicesSection } from "./ServicesSection";
import { ContactSection } from "./ContactSection";
import { ParticleSnow } from "./ParticleSnow";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-black font-sans text-white">
      <ParticleSnow />
      <HeroSection />
      <div id="nosotros">
        <AboutSection />
      </div>
      <div id="enfoque">
        <ApproachSection />
      </div>
      <PhilosophySection />
      <ServicesSection />
      <ContactSection />
    </div>
  );
}
