import { useCallback, useState } from "react";
import { SplashScreen } from "./SplashScreen";
import { Navbar } from "./Navbar";
import { HeroSection } from "./HeroSection";
import { AboutSection } from "./AboutSection";
import { ServicesSection } from "./ServicesSection";
import { ApproachSection } from "./ApproachSection";
import { FeaturesSection } from "./FeaturesSection";
import { ContactSection } from "./ContactSection";
import { Footer } from "./Footer";
import { BRAND_VIDEO_URL } from "../lib/brand";

/**
 * Landing de Nucleo. El video de marca vive en una capa **fija** al fondo
 * (z-0): solo se ve a través del hero, que es transparente; el resto de las
 * secciones lo tapan con su propio fondo. Por eso ni la raíz ni el hero llevan
 * `bg-black` — el negro de respaldo va dentro de esa misma capa.
 */
export function LandingPage() {
  const [showSplash, setShowSplash] = useState(true);
  const hideSplash = useCallback(() => setShowSplash(false), []);

  return (
    <div className="relative min-h-screen font-sans text-white">
      {/* Capa fija: video de marca + velo de legibilidad */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 bg-black">
        <video
          className="h-full w-full object-cover"
          autoPlay
          loop
          muted
          playsInline
          src={BRAND_VIDEO_URL}
        />
        <div className="absolute inset-0 bg-black/30" />
      </div>

      {showSplash && <SplashScreen onComplete={hideSplash} />}

      <Navbar />

      <main className="relative z-10">
        <HeroSection />
        <AboutSection />
        <ServicesSection />
        <ApproachSection />
        <FeaturesSection />
        <ContactSection />
        <Footer />
      </main>
    </div>
  );
}
