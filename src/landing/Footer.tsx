import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Phone, Mail } from "lucide-react";
import { AtomLogo } from "./AtomLogo";

function Col({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-4 text-xs uppercase tracking-widest text-white/40">{title}</p>
      <ul className="flex flex-col gap-3 text-sm">{children}</ul>
    </div>
  );
}

function FLink({ href, to, children }: { href?: string; to?: string; children: ReactNode }) {
  const cls = "text-white/60 transition-colors hover:text-white";
  return (
    <li>
      {to ? (
        <Link to={to} className={cls}>
          {children}
        </Link>
      ) : (
        <a href={href} className={cls}>
          {children}
        </a>
      )}
    </li>
  );
}

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="relative overflow-hidden border-t border-white/10 bg-black px-6 pb-10 pt-16 md:pt-20">
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-5">
          {/* Marca + pitch */}
          <div className="col-span-2">
            <div className="flex items-center gap-2">
              <AtomLogo size={28} pulse={false} glow={false} />
              <span className="font-display text-lg font-semibold tracking-tight text-white">
                nucleo
              </span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/50">
              El núcleo de tu vida deportiva. Software y red para gimnasios y boxes de CrossFit en
              Guatemala.
            </p>
          </div>

          <Col title="Plataforma">
            <FLink href="#servicios">Administración y cobro</FLink>
            <FLink href="#funciones">Comunidad y feed</FLink>
            <FLink href="#funciones">Marketplace</FLink>
            <FLink href="#servicios">Red y crecimiento</FLink>
          </Col>

          <Col title="Empresa">
            <FLink href="#nosotros">Nosotros</FLink>
            <FLink href="#funciones">Funciones</FLink>
            <FLink href="#contacto">Contacto</FLink>
            <FLink to="/login">Portal Admin</FLink>
          </Col>

          <Col title="Contacto">
            <li>
              <a
                href="tel:+50249740808"
                className="flex items-center gap-2 text-white/60 transition-colors hover:text-white"
              >
                <Phone size={15} className="text-nucleo-flame" />
                +502 4974 0808
              </a>
            </li>
            <li>
              <a
                href="mailto:jgarcia@devpackgroup.com"
                className="flex items-center gap-2 break-all text-white/60 transition-colors hover:text-white"
              >
                <Mail size={15} className="text-nucleo-flame" />
                jgarcia@devpackgroup.com
              </a>
            </li>
          </Col>
        </div>

        {/* Barra inferior */}
        <div className="mt-14 flex flex-col items-center gap-3 border-t border-white/10 pt-8 text-xs text-white/40 md:flex-row md:justify-between">
          <span>© {year} Nucleo · Devpack Group. Todos los derechos reservados.</span>
          <span>Hecho en Guatemala 🇬🇹</span>
        </div>
      </div>
    </footer>
  );
}
