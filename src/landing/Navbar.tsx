import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Menu, X } from "lucide-react";
import { AtomLogo } from "./AtomLogo";

const NAV_LINKS = [
  { label: "Nosotros", id: "nosotros" },
  { label: "Plataforma", id: "plataforma" },
  { label: "Retención", id: "retencion" },
  { label: "Funciones", id: "funciones" },
  { label: "Contacto", id: "contacto" },
];

/** Alto (px) al que se considera que la barra "toca" una sección. */
const NAV_LINE = 48;

/**
 * Navbar flotante del nuevo lenguaje: logo a la izquierda, pastilla blanca de
 * navegación al centro (desktop) y CTA negro con cuadro de acento a la derecha.
 * Sobre las secciones claras (`data-nav-light`) el logo y la hamburguesa se
 * invierten a negro.
 */
export function Navbar() {
  const [active, setActive] = useState("nosotros");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [onLight, setOnLight] = useState(false);

  useEffect(() => {
    // Las secciones claras son estáticas: se consultan una vez.
    const light = Array.from(document.querySelectorAll<HTMLElement>("[data-nav-light]"));

    // Medición directa (sin rAF): en pestañas que no componen, rAF no dispara y
    // la barra se quedaría con el color equivocado sobre las secciones claras.
    // React descarta el re-render cuando el valor no cambia, así que es barato.
    const measure = () => {
      // ¿La barra está sobre una sección clara?
      setOnLight(
        light.some((el) => {
          const r = el.getBoundingClientRect();
          return r.top <= NAV_LINE && r.bottom >= NAV_LINE;
        }),
      );

      // Scroll-spy: la última sección cuyo inicio ya pasó el tercio superior.
      const line = window.innerHeight * 0.35;
      let current = NAV_LINKS[0].id;
      for (const l of NAV_LINKS) {
        const el = document.getElementById(l.id);
        if (el && el.getBoundingClientRect().top <= line) current = l.id;
      }
      setActive(current);
    };

    measure();
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure, { passive: true });
    return () => {
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, []);

  // Bloquea el scroll del fondo mientras el menú móvil está abierto.
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const go = useCallback((id: string) => {
    setActive(id);
    setMobileOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // Sobre secciones claras el logo/hamburguesa pasan a negro (salvo con el menú abierto).
  const dark = onLight && !mobileOpen;

  return (
    <>
      <nav className="fixed left-0 right-0 top-0 z-50 px-4 py-4 sm:px-6 lg:px-10">
        <div className="flex items-center justify-between gap-4">
          {/* Marca */}
          <Link to="/" className="z-50 flex flex-shrink-0 items-center gap-2">
            <AtomLogo size={30} />
            <span
              className={`font-display text-base font-semibold tracking-tight transition-colors duration-300 ${
                dark ? "text-black" : "text-white"
              }`}
            >
              nucleo
            </span>
          </Link>

          {/* Pastilla central (desktop) */}
          <div className="hidden items-center rounded-lg bg-white shadow-sm lg:flex">
            {NAV_LINKS.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => go(l.id)}
                className={`rounded-lg px-5 py-2.5 font-mono text-sm font-medium transition-all duration-200 ${
                  active === l.id ? "bg-black text-white" : "text-black/60 hover:text-black"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>

          {/* CTA (desktop) */}
          <Link
            to="/login"
            className="group hidden items-center overflow-hidden rounded-lg bg-black transition-transform duration-200 active:scale-[0.98] lg:flex"
          >
            <span className="m-0.5 flex h-9 w-9 items-center justify-center rounded-md bg-white/10">
              <ChevronRight className="h-4 w-4 text-white transition-transform group-hover:translate-x-0.5" />
            </span>
            <span className="px-4 py-2.5 font-mono text-sm font-medium text-white">
              Portal Admin
            </span>
          </Link>

          {/* Hamburguesa (móvil) */}
          <button
            type="button"
            aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
            className={`relative z-50 flex h-10 w-10 items-center justify-center rounded-lg border backdrop-blur-md transition-colors duration-300 lg:hidden ${
              dark ? "border-black/10 bg-black/5" : "border-white/10 bg-white/10"
            }`}
          >
            <X
              className={`absolute h-5 w-5 text-white transition-all duration-300 ease-out ${
                mobileOpen ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-75 opacity-0"
              }`}
            />
            <Menu
              className={`absolute h-5 w-5 transition-all duration-300 ease-out ${
                dark ? "text-black" : "text-white"
              } ${mobileOpen ? "rotate-90 scale-75 opacity-0" : "rotate-0 scale-100 opacity-100"}`}
            />
          </button>
        </div>
      </nav>

      {/* Overlay móvil */}
      <div
        className={`fixed inset-0 z-40 transition-all duration-700 ease-expo lg:hidden ${
          mobileOpen ? "visible opacity-100" : "invisible opacity-0"
        }`}
      >
        <button
          type="button"
          tabIndex={-1}
          aria-hidden
          onClick={() => setMobileOpen(false)}
          className={`absolute inset-0 w-full cursor-default bg-black transition-opacity duration-700 ease-expo ${
            mobileOpen ? "opacity-95" : "opacity-0"
          }`}
        />
        <div className="relative flex h-full flex-col justify-between px-6 pb-10 pt-24">
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map((l, i) => (
              <button
                key={l.id}
                type="button"
                onClick={() => go(l.id)}
                style={{
                  transitionDelay: `${
                    mobileOpen ? 150 + i * 70 : (NAV_LINKS.length - i) * 30
                  }ms`,
                }}
                className={`w-full rounded-xl px-4 py-4 text-left font-display text-2xl font-medium transition-all duration-500 ease-expo ${
                  active === l.id ? "bg-white/10 text-white" : "text-white/60"
                } ${mobileOpen ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}`}
              >
                <span className="flex items-center justify-between">
                  {l.label}
                  <ChevronRight
                    className={`h-5 w-5 transition-all duration-300 ${
                      active === l.id ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0"
                    }`}
                  />
                </span>
              </button>
            ))}
          </div>

          <div
            style={{ transitionDelay: `${mobileOpen ? 150 + NAV_LINKS.length * 70 + 50 : 0}ms` }}
            className={`transition-all duration-500 ease-expo ${
              mobileOpen ? "translate-y-0 opacity-100" : "translate-y-12 opacity-0"
            }`}
          >
            <Link
              to="/login"
              onClick={() => setMobileOpen(false)}
              className="flex w-full items-center justify-center gap-3 rounded-xl bg-white px-6 py-4 font-display text-lg font-medium text-black transition-transform duration-200 active:scale-[0.98]"
            >
              Portal Admin
              <ChevronRight className="h-5 w-5" />
            </Link>
            <p className="mt-4 text-center font-mono text-xs text-white/30">
              La red deportiva de Guatemala
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
