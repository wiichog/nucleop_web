import { CtaButton } from "./ui";

/**
 * Hero a pantalla completa, transparente: el video de marca vive en la capa fija
 * de `LandingPage`, así que aquí solo va la tipografía. Entradas escalonadas con
 * `fade-up` (ease-out-expo).
 */
export function HeroSection() {
  return (
    <section className="relative flex h-[100svh] w-full flex-col">
      {/* Bloque superior centrado */}
      <div className="flex flex-col items-center px-4 pt-36 text-center sm:px-6 sm:pt-48 lg:px-10">
        <p
          className="mb-10 animate-fade-up font-mono text-xs uppercase tracking-[0.3em] text-white/70 opacity-0 sm:mb-14 sm:text-sm"
          style={{ animationDelay: "0.3s" }}
        >
          Red deportiva · Guatemala
        </p>

        <h1
          className="hero-title animate-fade-up font-display text-4xl font-medium text-white opacity-0 sm:text-6xl md:text-7xl lg:text-[5.5rem]"
          style={{ animationDelay: "0.5s" }}
        >
          Opera tu gym.
          <br />
          Retén a tu gente<span className="text-nucleo-flame">.</span>
          <span className="sr-only">
            {" "}
            Nucleo — software y red deportiva para gimnasios y boxes de CrossFit en Guatemala.
          </span>
        </h1>
      </div>

      {/* Barra inferior: promesa a la izquierda, CTA a la derecha */}
      <div className="mt-auto flex flex-col gap-6 px-4 pb-8 sm:flex-row sm:items-end sm:justify-between sm:px-6 sm:pb-12 lg:px-10">
        <p
          className="max-w-sm animate-fade-up font-mono text-xs leading-relaxed text-white/60 opacity-0 sm:text-sm"
          style={{ animationDelay: "0.7s" }}
        >
          Membresías, cobros, clases y comunidad en un solo sistema — y una identidad que sigue al
          atleta entre boxes.
        </p>

        <div className="animate-fade-up opacity-0" style={{ animationDelay: "0.9s" }}>
          <CtaButton href="#contacto" label="Pide una demo" variant="flame" />
        </div>
      </div>
    </section>
  );
}
