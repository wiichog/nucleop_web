import { CtaButton } from "./ui";
import { useReveal } from "./useReveal";
import { BRAND_VIDEO_URL } from "../lib/brand";

/**
 * "Nosotros" — primera sección clara. El video de marca queda debajo de un velo
 * casi opaco del mismo color del fondo: aporta movimiento sin robarle contraste
 * al texto negro.
 */
export function AboutSection() {
  const { ref, visible } = useReveal<HTMLElement>(0.1);

  return (
    <section
      id="nosotros"
      data-nav-light
      ref={ref}
      className="relative min-h-screen w-full scroll-mt-20 overflow-hidden bg-[#f0eded]"
    >
      <video
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay
        loop
        muted
        playsInline
        src={BRAND_VIDEO_URL}
      />
      <div className="absolute inset-0 bg-[#f0eded]/[0.88]" />

      <div className="relative z-10 flex min-h-screen flex-col justify-between px-4 pb-10 pt-28 sm:px-6 sm:pb-16 lg:px-10">
        {/* Bloque superior izquierdo */}
        <div className="max-w-xs sm:max-w-sm">
          <p
            className={`mb-6 font-mono text-xs leading-relaxed text-black/80 opacity-0 sm:text-sm ${
              visible ? "animate-fade-up" : ""
            }`}
            style={{ animationDelay: "0.1s" }}
          >
            Una sola red que conecta gimnasios, atletas y coaches. El historial del atleta —PRs,
            puntos y asistencia— viaja con él aunque cambie de box.
          </p>
          <div
            className={`opacity-0 ${visible ? "animate-fade-up" : ""}`}
            style={{ animationDelay: "0.25s" }}
          >
            <CtaButton href="#contacto" label="Pide una demo" variant="light" />
          </div>
        </div>

        {/* Bloque inferior: titular y contra-titular */}
        <div className="mt-auto flex flex-col items-start justify-between gap-8 pt-24 md:flex-row md:items-end md:gap-16">
          <h2
            className={`max-w-md font-display text-2xl font-medium leading-snug text-black opacity-0 sm:text-3xl lg:text-4xl ${
              visible ? "animate-fade-up" : ""
            }`}
            style={{ animationDelay: "0.4s" }}
          >
            Conoce Nucleo. Hecho para <span className="text-black/40">conectar señales</span> y
            evitar que tu gimnasio pierda gente
          </h2>

          <p
            className={`max-w-lg font-display text-xl font-medium leading-snug text-black opacity-0 md:text-right sm:text-2xl lg:text-3xl ${
              visible ? "animate-fade-up" : ""
            }`}
            style={{ animationDelay: "0.55s" }}
          >
            Detecta al atleta que se está apagando y entiende cómo{" "}
            <span className="text-black/40">señales sueltas</span> terminan en{" "}
            <span className="font-bold">bajas reales</span>
          </p>
        </div>
      </div>
    </section>
  );
}
