import { Flame, ShieldAlert, Users } from "lucide-react";
import { CtaButton, Eyebrow } from "./ui";
import { useReveal } from "./useReveal";

const PILARES = [
  {
    Icon: Flame,
    title: "Puntos y rachas",
    description:
      "Cada check-in, PR y clase suma. El atleta vuelve porque su progreso vive aquí.",
  },
  {
    Icon: ShieldAlert,
    title: "Alertas de riesgo",
    description:
      "Detectamos al alumno que está por irse antes de que se vaya, y te avisamos a tiempo.",
  },
  {
    Icon: Users,
    title: "Comunidad real",
    description:
      "Feed, retos y atleta del mes. El gimnasio deja de ser un local y se vuelve una tribu.",
  },
];

/**
 * "Retención" — la sección que sostiene el argumento comercial: los gyms no
 * migran por cobrar mejor, migran por dejar de perder alumnos. Fondo negro plano
 * (sin halos) y pilares como lista editorial con filete.
 */
export function ApproachSection() {
  const { ref, visible } = useReveal<HTMLElement>(0.1);
  const show = (cls: string) => (visible ? cls : "");

  return (
    <section
      id="retencion"
      ref={ref}
      className="relative w-full scroll-mt-20 overflow-hidden bg-black px-4 py-24 sm:px-6 md:py-36 lg:px-10"
    >
      <div className="mx-auto grid max-w-6xl gap-12 md:grid-cols-2 md:gap-16">
        {/* Mensaje */}
        <div className={`opacity-0 ${show("animate-fade-up")}`} style={{ animationDelay: "0.1s" }}>
          <Eyebrow>Nuestro enfoque</Eyebrow>

          <h2 className="hero-title mt-7 font-display text-3xl font-medium text-white sm:text-5xl">
            No vendemos software de cobro.
          </h2>
          <h2 className="hero-title font-display text-3xl font-medium text-white/40 sm:text-5xl">
            Construimos retención<span className="text-nucleo-flame">.</span>
          </h2>

          <p className="mt-8 max-w-md font-mono text-xs leading-relaxed text-white/60 sm:text-sm">
            Puntos, rachas, PRs y alertas de riesgo para que cada gimnasio deje de perder alumnos —
            y cada atleta encuentre su comunidad.
          </p>

          <div className="mt-9">
            <CtaButton href="#plataforma" label="Conoce cómo" variant="ghost" size="sm" />
          </div>
        </div>

        {/* Pilares */}
        <div className="flex flex-col">
          {PILARES.map((p, i) => (
            <div
              key={p.title}
              className={`flex items-start gap-5 border-t border-white/10 py-7 opacity-0 last:border-b ${show(
                "animate-fade-up",
              )}`}
              style={{ animationDelay: `${0.25 + i * 0.12}s` }}
            >
              <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-white/[0.04]">
                <p.Icon size={19} strokeWidth={1.5} className="text-nucleo-flame" />
              </span>
              <div className="min-w-0">
                <div className="flex items-baseline gap-3">
                  <h3 className="font-display text-lg font-medium tracking-tight text-white">
                    {p.title}
                  </h3>
                  <span className="font-mono text-[11px] tracking-[0.2em] text-white/25">
                    0{i + 1}
                  </span>
                </div>
                <p className="mt-2 font-mono text-xs leading-relaxed text-white/50 sm:text-sm">
                  {p.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
