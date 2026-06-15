import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Menu, X } from "lucide-react";
import { AtomLogo } from "./AtomLogo";
import { BRAND_VIDEO_URL } from "../lib/brand";

const NAV_LINKS = [
  { label: "plataforma", href: "#servicios" },
  { label: "comunidad", href: "#funciones" },
  { label: "nosotros", href: "#nosotros" },
  { label: "contacto", href: "#contacto" },
];

/**
 * Hero a pantalla completa con video de fondo, navbar de pastillas flotantes y
 * titulares gigantes escalonados. Estructura inspirada en el brief "securify"
 * pero vestida con el manual de marca de Nucleo: tipografía Space Grotesk,
 * negro profundo + naranja flame, logo átomo y copy en español.
 */
export function HeroSection() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <section className="relative h-screen w-full overflow-hidden bg-nucleo-ink">
      {/* ===== Video de fondo a pantalla completa ===== */}
      <video
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay
        loop
        muted
        playsInline
        src={BRAND_VIDEO_URL}
      />
      {/* Velos de marca: oscurecer para legibilidad + tinte flame superior muy sutil */}
      <div className="absolute inset-0 bg-black/45" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(252,76,2,0.10),_transparent_60%)]" />

      {/* ===== Navbar de pastillas flotantes ===== */}
      <nav className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between gap-4 px-6 pt-6 md:px-10">
        {/* Pastilla izquierda: marca */}
        <Link
          to="/"
          className="flex items-center gap-2 rounded-full border border-white/10 bg-nucleo-carbon/80 py-3 pl-3 pr-5 backdrop-blur"
        >
          <AtomLogo size={22} pulse={false} glow={false} />
          <span className="font-display text-sm font-semibold tracking-tight text-white">nucleo</span>
        </Link>

        {/* Pastilla central: navegación (oculta en móvil) */}
        <div className="hidden items-center gap-1 rounded-full border border-white/10 bg-nucleo-carbon/80 px-3 py-2 backdrop-blur md:flex">
          {NAV_LINKS.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="rounded-full px-5 py-2 font-display text-sm text-white/70 transition-colors hover:text-white"
            >
              {l.label}
            </a>
          ))}
        </div>

        {/* Pastilla derecha: CTA + hamburguesa móvil */}
        <div className="flex items-center gap-2">
          <Link
            to="/login"
            className="rounded-full bg-nucleo-flame px-6 py-3 font-display text-sm font-medium text-white transition-colors hover:bg-nucleo-coral"
          >
            portal admin
          </Link>
          <button
            type="button"
            aria-label="Abrir menú"
            onClick={() => setMenuOpen(true)}
            className="rounded-full border border-white/10 bg-nucleo-carbon/80 p-3 text-white backdrop-blur md:hidden"
          >
            <Menu size={18} />
          </button>
        </div>
      </nav>

      {/* Overlay móvil a pantalla completa */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-nucleo-ink/98 px-6 py-6 backdrop-blur-md md:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AtomLogo size={30} pulse={false} glow={false} />
              <span className="font-display text-xl font-bold tracking-tight text-white">nucleo</span>
            </div>
            <button type="button" aria-label="Cerrar menú" onClick={() => setMenuOpen(false)} className="text-white">
              <X size={26} />
            </button>
          </div>
          <div className="mt-16 flex flex-col gap-8">
            {NAV_LINKS.map((l) => (
              <a
                key={l.label}
                href={l.href}
                onClick={() => setMenuOpen(false)}
                className="font-display text-4xl font-semibold tracking-tight text-white transition-colors hover:text-nucleo-flame"
              >
                {l.label}
              </a>
            ))}
            <Link
              to="/login"
              className="mt-4 inline-flex w-fit items-center gap-2 rounded-full bg-nucleo-flame px-7 py-3 text-sm font-bold uppercase tracking-wide text-white"
            >
              Portal Admin
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      )}

      {/* ===== Contenido foreground (sobre el video) ===== */}
      <div className="relative h-full w-full">
        {/* H1 semántico único para SEO (las palabras visibles son decorativas) */}
        <h1 className="sr-only">
          Nucleo — software y red deportiva para gimnasios y boxes de CrossFit en Guatemala:
          impulsa tu gimnasio
        </h1>

        {/* Titulares gigantes escalonados (decorativos) */}
        <div
          aria-hidden
          className="hero-title absolute left-4 top-[18%] font-display text-[14vw] font-medium text-white md:left-10 md:text-[13vw]"
        >
          impulsa
        </div>
        <div
          aria-hidden
          className="hero-title absolute right-4 top-[38%] font-display text-[14vw] font-medium text-white md:right-10 md:text-[13vw]"
        >
          tu
        </div>
        <div
          aria-hidden
          className="hero-title absolute left-[18%] top-[58%] font-display text-[14vw] font-medium text-white md:left-[28%] md:text-[13vw]"
        >
          gimnasio<span className="text-nucleo-flame">.</span>
        </div>

        {/* Descripción */}
        <p className="absolute left-6 top-[46%] max-w-[260px] text-[15px] leading-snug text-white/90 md:left-10">
          Administramos, cobramos y retenemos por ti — y a cada atleta le damos una identidad
          portátil entre boxes, clubes y eventos.
        </p>

        {/* Gradiente inferior */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-b from-transparent to-black" />
      </div>
    </section>
  );
}
