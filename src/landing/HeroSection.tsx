import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Menu, X } from "lucide-react";
import { AtomLogo } from "./AtomLogo";

const NAV_LINKS = [
  { label: "PLATAFORMA", href: "#servicios" },
  { label: "COMUNIDAD", href: "#enfoque" },
  { label: "NOSOTROS", href: "#nosotros" },
  { label: "CONTACTO", href: "#contacto" },
];

export function HeroSection() {
  const [menuOpen, setMenuOpen] = useState(false);
  const year = new Date().getFullYear();

  return (
    <section className="relative flex min-h-screen flex-col overflow-hidden bg-nucleo-ink">
      {/* ===== Fondo: degradado naranja sutil (sin video) ===== */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(252,76,2,0.14),_transparent_60%)]" />
      <div className="absolute inset-0 bg-gradient-to-t from-nucleo-ink via-transparent to-transparent" />

      {/* Grid vertical (desktop) */}
      <div aria-hidden className="absolute inset-0 hidden md:block">
        {["25%", "50%", "75%"].map((left) => (
          <div
            key={left}
            className="absolute top-0 h-full w-px bg-white/10"
            style={{ left }}
          />
        ))}
      </div>

      {/* Glow central (elipse cyan/verde con blur) */}
      <svg
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[8%] -translate-x-1/2"
        width="900"
        height="360"
        viewBox="0 0 900 360"
      >
        <defs>
          <filter id="hero-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="25" />
          </filter>
        </defs>
        <ellipse cx="450" cy="180" rx="360" ry="90" fill="#b8380a" opacity="0.45" filter="url(#hero-glow)" />
        <ellipse cx="450" cy="170" rx="220" ry="55" fill="#FC4C02" opacity="0.3" filter="url(#hero-glow)" />
      </svg>

      {/* ===== Navegación ===== */}
      <header className="relative z-30 px-6 py-6 md:px-10">
        <nav className="mx-auto flex max-w-6xl items-center justify-between">
          <a href="#top" className="flex items-center gap-2">
            <AtomLogo size={30} />
            <span className="font-display text-xl font-bold tracking-tight text-white">Nucleo</span>
          </a>

          <div className="hidden items-center gap-9 md:flex">
            {NAV_LINKS.map((l) => (
              <a
                key={l.label}
                href={l.href}
                className="font-display text-[15px] font-medium tracking-wide text-white/80 transition-colors hover:text-nucleo-flame"
              >
                {l.label}
              </a>
            ))}
          </div>

          <Link
            to="/login"
            className="hidden items-center gap-2 rounded-full bg-nucleo-flame px-5 py-2 text-xs font-bold uppercase tracking-wide text-white transition-transform hover:scale-105 md:inline-flex"
          >
            Portal Admin
          </Link>

          {/* Hamburguesa (móvil) */}
          <button
            type="button"
            aria-label="Abrir menú"
            onClick={() => setMenuOpen(true)}
            className="text-white md:hidden"
          >
            <Menu size={26} />
          </button>
        </nav>
      </header>

      {/* Overlay móvil a pantalla completa */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-nucleo-ink/98 px-6 py-6 backdrop-blur-md md:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AtomLogo size={30} pulse={false} />
              <span className="font-display text-xl font-bold tracking-tight text-white">Nucleo</span>
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

      {/* ===== Contenido del hero ===== */}
      <div id="top" className="relative z-20 flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
        {/* Liquid glass card flotante */}
        <div className="liquid-glass flex h-[200px] w-[200px] -translate-y-[50px] flex-col justify-between rounded-2xl p-5 text-left">
          <span className="font-display text-sm font-medium tracking-widest text-nucleo-flame">
            [ {year} ]
          </span>
          <div>
            <p className="font-display text-[18px] font-semibold leading-snug text-white">
              Hecho para <span className="text-nucleo-flame">atletas</span> y gimnasios
            </p>
            <p className="mt-2 font-sans text-[11px] leading-relaxed text-white/55">
              El núcleo de tu vida deportiva, en una sola red.
            </p>
          </div>
        </div>

        <p className="-mt-2 font-display text-[11px] font-bold uppercase tracking-[0.25em] text-nucleo-flame">
          Red deportiva
        </p>

        <h1 className="mt-4 font-display text-[40px] font-bold uppercase leading-[0.95] tracking-tight text-white sm:text-6xl lg:text-7xl">
          Impulsa tu gimnasio<span className="text-nucleo-flame">.</span>
        </h1>

        <p className="mt-6 max-w-[512px] font-sans text-sm leading-relaxed text-white/70">
          Administra, cobra y retén desde un solo lugar. Nucleo conecta a tu gimnasio con su
          comunidad y le da a cada atleta una identidad portátil entre boxes, clubes y eventos.
        </p>

        <div className="mt-9 flex flex-col items-center gap-4 sm:flex-row">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 rounded-full bg-nucleo-flame px-8 py-3.5 text-sm font-bold uppercase tracking-wide text-white transition-transform hover:scale-105"
          >
            Portal Admin
            <ArrowRight size={18} />
          </Link>
          <a
            href="#contacto"
            className="liquid-glass rounded-full px-8 py-3.5 text-sm font-medium text-white transition-colors hover:bg-white/5"
          >
            Solicitar demo
          </a>
        </div>
      </div>
    </section>
  );
}
