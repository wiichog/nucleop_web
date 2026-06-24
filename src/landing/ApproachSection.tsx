import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { ArrowUpRight, Flame, ShieldAlert, Users } from "lucide-react";
import { Eyebrow, DiagonalDivider } from "./ui";

/**
 * "Nuestro enfoque" — sección content-first (sin depender de fotos), en el mismo
 * lenguaje white-dominant + acento naranja del resto de la landing: titular
 * lowercase con punto flame, copy en blanco tenue y tres pilares en tarjetas
 * glass (borde white/10, ícono que pasa a flame al hover).
 */
const PILARES = [
  {
    Icon: Flame,
    title: "puntos y rachas",
    description:
      "cada check-in, PR y clase suma. el atleta vuelve porque su progreso vive aquí.",
  },
  {
    Icon: ShieldAlert,
    title: "alertas de riesgo",
    description:
      "detectamos al alumno que está por irse antes de que se vaya, y te avisamos a tiempo.",
  },
  {
    Icon: Users,
    title: "comunidad real",
    description:
      "feed, retos y atleta del mes. el gimnasio deja de ser un local y se vuelve una tribu.",
  },
];

export function ApproachSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="relative overflow-hidden bg-black px-6 py-28 md:py-40">
      {/* Halo cálido apenas perceptible (mismo motivo del resto de secciones) */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(252,76,2,0.06),_transparent_55%)]" />

      <div className="relative z-10 mx-auto grid max-w-6xl gap-12 md:grid-cols-2 md:gap-16">
        {/* Columna izquierda: mensaje */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
        >
          <Eyebrow>nuestro enfoque</Eyebrow>
          <h2 className="hero-title mt-7 font-display text-4xl font-medium lowercase text-white md:text-6xl">
            no vendemos software de cobro<span className="text-nucleo-flame">.</span>
          </h2>
          <h2 className="hero-title font-display text-4xl font-medium lowercase text-white/40 md:text-6xl">
            construimos retención<span className="text-nucleo-flame">.</span>
          </h2>

          <p className="mt-8 max-w-md text-base leading-relaxed text-white/60">
            puntos, rachas, PRs y alertas de riesgo para que cada gimnasio deje de perder
            alumnos — y cada atleta encuentre su comunidad.
          </p>

          <motion.a
            href="#servicios"
            whileTap={{ scale: 0.97 }}
            className="group mt-9 inline-flex items-center gap-2 rounded-full border border-white/15 bg-nucleo-carbon/80 px-7 py-3 font-display text-sm text-white backdrop-blur transition-colors hover:border-nucleo-flame/60"
          >
            conoce cómo
            <ArrowUpRight
              size={16}
              className="text-nucleo-flame transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            />
          </motion.a>
        </motion.div>

        {/* Columna derecha: pilares */}
        <div className="flex flex-col gap-4">
          {PILARES.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, delay: 0.15 + i * 0.12 }}
              className="group flex items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-6 transition-colors duration-300 hover:border-white/25 hover:bg-white/[0.04]"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-white/80 transition-colors duration-300 group-hover:text-nucleo-flame">
                <p.Icon size={20} strokeWidth={1.5} />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <h3 className="font-display text-lg font-medium lowercase tracking-tight text-white">
                    {p.title}
                  </h3>
                  <DiagonalDivider />
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-white/50">{p.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
